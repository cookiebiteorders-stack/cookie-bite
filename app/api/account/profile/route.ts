import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isProfileComplete } from "@/lib/account/profile-complete";
import { completeProfileSchema } from "@/lib/account/profile-schema";
import {
  getUserByClerkId,
  markProfileCompleted,
  updateUserProfile,
  upsertUserFromClerk,
} from "@/lib/db/users";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { tryNotifyStaffNewCustomer } from "@/lib/notifications/new-customer-staff-alert";
import { bilingualError } from "@/lib/validations";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), { status: 401 });
  }

  let dbUser = await getUserByClerkId(userId);
  if (!dbUser) {
    const clerkUser = await currentUser();
    const email = clerkUser?.primaryEmailAddress?.emailAddress;
    if (email) {
      dbUser = await upsertUserFromClerk({
        clerkUserId: userId,
        email,
        fullName:
          [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim() ||
          null,
        avatarUrl: clerkUser?.imageUrl ?? null,
      });
    }
  }

  if (!dbUser) {
    return NextResponse.json(
      bilingualError("Profile not found", "لم يُعثر على الملف"),
      { status: 404 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: defaultAddress } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", dbUser.id)
    .eq("is_default", true)
    .maybeSingle();

  return NextResponse.json({
    profile: dbUser,
    complete: isProfileComplete(dbUser),
    default_address: defaultAddress ?? null,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), { status: 401 });
  }

  const parsed = completeProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid profile data", "بيانات الملف غير صالحة"),
      { status: 400 },
    );
  }

  let dbUser = await getUserByClerkId(userId);
  if (!dbUser) {
    const clerkUser = await currentUser();
    const email = clerkUser?.primaryEmailAddress?.emailAddress;
    if (!email) {
      return NextResponse.json(
        bilingualError("No email on account", "لا يوجد بريد للحساب"),
        { status: 400 },
      );
    }
    dbUser = await upsertUserFromClerk({
      clerkUserId: userId,
      email,
      fullName: parsed.data.full_name_en,
      avatarUrl: clerkUser?.imageUrl ?? null,
    });
  }
  if (!dbUser) {
    return NextResponse.json(
      bilingualError("Could not save profile", "تعذّر حفظ الملف"),
      { status: 500 },
    );
  }

  const body = parsed.data;
  const updated = await updateUserProfile(dbUser.id, {
    full_name_en: body.full_name_en,
    full_name_ar: body.full_name_ar,
    full_name: body.full_name_en,
    phone: body.phone,
    phone_secondary: body.phone_secondary,
    profile_notes: body.profile_notes,
  });
  if (!updated) {
    return NextResponse.json(
      bilingualError("Could not save profile", "تعذّر حفظ الملف"),
      { status: 500 },
    );
  }

  const supabase = createSupabaseAdminClient();
  await supabase.from("addresses").update({ is_default: false }).eq("user_id", dbUser.id);

  const addr = body.address;
  const { error: addrError } = await supabase.from("addresses").insert({
    user_id: dbUser.id,
    label: addr.label ?? "Home",
    recipient: addr.recipient,
    phone: addr.phone,
    phone_secondary: addr.phone_secondary,
    street: addr.street,
    building: addr.building,
    floor: addr.floor,
    apartment: addr.apartment,
    city: addr.city,
    governorate: addr.governorate,
    delivery_notes: addr.delivery_notes,
    latitude: addr.latitude,
    longitude: addr.longitude,
    is_default: true,
  });

  if (addrError) {
    console.error("complete profile address insert", addrError);
    return NextResponse.json(
      bilingualError("Could not save address", "تعذّر حفظ العنوان"),
      { status: 500 },
    );
  }

  const completed = await markProfileCompleted(dbUser.id);

  const profileUser = completed ?? updated;
  try {
    const staffResult = await tryNotifyStaffNewCustomer({
      kind: "profile_complete",
      user: profileUser,
      address: {
        label: addr.label,
        recipient: addr.recipient,
        phone: addr.phone,
        phone_secondary: addr.phone_secondary,
        street: addr.street,
        building: addr.building,
        floor: addr.floor,
        apartment: addr.apartment,
        city: addr.city,
        governorate: addr.governorate,
        delivery_notes: addr.delivery_notes,
        latitude: addr.latitude,
        longitude: addr.longitude,
      },
    });
    if (staffResult.sent === 0 && staffResult.reason !== "already_sent") {
      console.warn("staff profile alert skipped", staffResult.reason);
    }
  } catch (err) {
    console.error("staff profile alert failed", err);
  }

  try {
    const client = await clerkClient();
    const parts = body.full_name_en.trim().split(/\s+/);
    const firstName = parts[0] ?? body.full_name_en;
    const lastName = parts.slice(1).join(" ") || undefined;
    await client.users.updateUser(userId, {
      firstName,
      lastName: lastName || undefined,
    });
  } catch (err) {
    console.error("sync clerk name after profile complete", err);
  }

  return NextResponse.json({
    ok: true,
    profile: completed ?? updated,
    complete: true,
  });
}
