#!/usr/bin/env node

/**
 * Verify HMAC from real Paymob webhook
 * Uses the actual payload received from the test payment
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createHmac } from 'crypto';

function loadEnvFile(envPath) {
  try {
    const content = readFileSync(envPath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#') && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
    return env;
  } catch (error) {
    return {};
  }
}

function str(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

function computePaymobTransactionHmac(transaction, secret) {
  const order = transaction.order || {};
  const sourceData = transaction.source_data || {};

  const connected =
    str(transaction.amount_cents) +
    str(transaction.created_at) +
    str(transaction.currency) +
    str(transaction.error_occured) +
    str(transaction.has_parent_transaction) +
    str(transaction.id) +
    str(transaction.integration_id) +
    str(transaction.is_3d_secure) +
    str(transaction.is_auth) +
    str(transaction.is_capture) +
    str(transaction.is_refunded) +
    str(transaction.is_standalone_payment) +
    str(transaction.is_voided) +
    str(order.id) +
    str(transaction.owner) +
    str(transaction.pending) +
    str(sourceData.pan) +
    str(sourceData.sub_type) +
    str(sourceData.type) +
    str(transaction.success);

  return createHmac("sha512", secret).update(connected).digest("hex");
}

function main() {
  const envLocal = loadEnvFile(resolve('.env.local'));
  const env = loadEnvFile(resolve('.env'));
  const config = { ...env, ...envLocal };

  const hmacSecret = config.PAYMOB_HMAC_SECRET;

  if (!hmacSecret) {
    console.error('❌ PAYMOB_HMAC_SECRET not found in .env');
    process.exit(1);
  }

  // Real payload from the test payment
  const realTransaction = {
    "id": 508564587,
    "pending": false,
    "amount_cents": 10000,
    "success": true,
    "is_auth": false,
    "is_capture": false,
    "is_standalone_payment": true,
    "is_voided": false,
    "is_refunded": false,
    "is_3d_secure": true,
    "integration_id": 5777362,
    "profile_id": 1163688,
    "has_parent_transaction": false,
    "order": {
      "id": 579868621,
      "created_at": "2026-08-04T02:03:21.531932",
      "delivery_needed": false,
      "merchant": {
        "id": 1163688,
        "created_at": "2026-05-14T14:35:14.399316",
        "phones": ["+201140165995"],
        "company_emails": ["fatmaelbeshawy75@gmail.com"],
        "company_name": "Cookie bite",
        "state": "",
        "country": "EGY",
        "city": "Cairo",
        "postal_code": "",
        "street": ""
      },
      "collector": null,
      "amount_cents": 10000,
      "shipping_data": {
        "id": 278649083,
        "first_name": "Test",
        "last_name": "User",
        "street": "NA",
        "building": "NA",
        "floor": "NA",
        "apartment": "NA",
        "city": "NA",
        "state": "NA",
        "country": "NA",
        "email": "test@example.com",
        "phone_number": "201000000000",
        "postal_code": "NA",
        "extra_description": "",
        "shipping_method": "UNK",
        "order_id": 579868621,
        "order": 579868621
      },
      "currency": "EGP",
      "is_payment_locked": false,
      "is_return": false,
      "is_cancel": false,
      "is_returned": false,
      "is_canceled": false,
      "merchant_order_id": "webhook-test-link-001",
      "wallet_notification": null,
      "paid_amount_cents": 10000,
      "notify_user_with_email": false,
      "items": [
        {
          "name": "Product Description",
          "description": "Webhook test payment",
          "amount_cents": 10000
        }
      ],
      "order_url": "https://accept.paymob.com/api/ecommerce/payment-links/unrestricted?token=LRR2T3hDUDBYa3RmaWZRR3dianhQVUo5UT09X1FXYzBYR0RoWWxXUXVLUWNMeTA1YkE9PQ",
      "commission_fees": 0,
      "delivery_fees_cents": 0,
      "delivery_vat_cents": 0,
      "payment_method": "tbc",
      "merchant_staff_tag": null,
      "api_source": "QUICKLINK",
      "data": {},
      "payment_status": "PAID",
      "terminal_version": null,
      "payme_details": null
    },
    "created_at": "2026-08-04T02:05:23.073002",
    "transaction_processed_callback_responses": [],
    "currency": "EGP",
    "source_data": {
      "pan": "2346",
      "type": "card",
      "tenure": null,
      "sub_type": "MasterCard"
    },
    "api_source": "QUICKLINK",
    "terminal_id": null,
    "merchant_commission": 0,
    "accept_fees": 0,
    "installment": null,
    "discount_details": [],
    "amount_cents_int": 10000,
    "is_void": false,
    "is_refund": false,
    "data": {
      "gateway_integration_pk": 5777362,
      "klass": "MigsPayment",
      "created_at": "2026-08-03T23:06:03.201366",
      "amount": 10000,
      "currency": "EGP",
      "migs_order": {
        "acceptPartialAmount": false,
        "amount": 100,
        "authenticationStatus": "AUTHENTICATION_SUCCESSFUL",
        "chargeback": {
          "amount": 0,
          "currency": "EGP"
        },
        "creationTime": "2026-08-03T23:05:40.650Z",
        "currency": "EGP",
        "description": "PAYMOB Cookie bi",
        "id": "579868621",
        "lastUpdatedTime": "2026-08-03T23:06:03.013Z",
        "merchantAmount": 100,
        "merchantCategoryCode": "7299",
        "merchantCurrency": "EGP",
        "reference": "_508564587_579",
        "status": "CAPTURED",
        "totalAuthorizedAmount": 100,
        "totalCapturedAmount": 100,
        "totalRefundedAmount": 0
      },
      "merchant": "TESTMERCH_C_25P",
      "migs_result": "SUCCESS",
      "migs_transaction": {
        "acquirer": {
          "batch": 20260803,
          "date": "0803",
          "id": "BMNF_S2I",
          "merchantId": "MERCH_C_25P",
          "settlementDate": "2026-08-03",
          "timeZone": "+0300",
          "transactionId": "123456789"
        },
        "amount": 100,
        "authenticationStatus": "AUTHENTICATION_SUCCESSFUL",
        "authorizationCode": "208359",
        "currency": "EGP",
        "id": "508564587",
        "receipt": "621523208359",
        "reference": "_508564587",
        "source": "INTERNET",
        "stan": "208359",
        "terminal": "BMNF0509",
        "type": "PAYMENT"
      },
      "txn_response_code": "APPROVED",
      "acq_response_code": "00",
      "message": "Approved",
      "merchant_txn_ref": "508564587",
      "order_info": "579868621",
      "receipt_no": "621523208359",
      "transaction_no": "123456789",
      "batch_no": 20260803,
      "authorize_id": "208359",
      "card_type": "MASTERCARD",
      "card_num": "512345xxxxxx2346",
      "secure_hash": "",
      "avs_result_code": "",
      "avs_acq_response_code": "00",
      "captured_amount": 100,
      "authorised_amount": 100,
      "refunded_amount": 0,
      "acs_eci": "02"
    },
    "is_hidden": false,
    "payment_key_claims": {
      "exp": 1785801873,
      "extra": {
        "accept_order_id": 579868621,
        "merchant_order_id": null
      },
      "user_id": 2236192,
      "currency": "EGP",
      "order_id": 579868621,
      "created_by": null,
      "is_partner": false,
      "amount_cents": 10000,
      "billing_data": {
        "city": "NA",
        "email": "NA@NA.com",
        "floor": "NA",
        "state": "NA",
        "street": "NA",
        "country": "NA",
        "building": "NA",
        "apartment": "NA",
        "last_name": "NA",
        "first_name": "NA",
        "postal_code": "NA",
        "phone_number": "NA",
        "extra_description": "NA"
      },
      "redirect_url": "https://accept.paymob.com/unifiedcheckout/payment-status?payment_token=ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SjFjMlZ5WDJsa0lqb3lNak0yTVRreUxDSmhiVzkxYm5SZlkyVnVkSE1pT2pFd01EQXdMQ0pqZFhKeVpXNWplU0k2SWtWSFVDSXNJbWx1ZEdWbmNtRjBhVzl1WDJsa0lqbzFOemMzTXpZeUxDSnZjbVJsY2w5cFpDSTZOVGM1T0RZNE5qSXhMQ0ppYVd4c2FXNW5YMlJoZEdFaU9uc2labWx5YzNSZmJtRnRaU0k2SWs1Qklpd2liR0Z6ZEY5dVlXMWxJam9pVGtFaUxDSnpkSEpsWlhRaU9pSk9RU0lzSW1KMWFXeGthVzVuSWpvaVRrRWlMQ0ptYkc5dmNpSTZJazVCSWl3aVlYQmhjblJ0Wlc1MElqb2lUa0VpTENKamFYUjVJam9pVGtFaUxDSnpkR0YwWlNJNklrNUJJaXdpWTI5MWJuUnllU0k2SWs1Qklpd2laVzFoYVd3aU9pSk9RVUJPUVM1amIyMGlMQ0p3YUc5dVpWOXVkVzFpWlhJaU9pSk9RU0lzSW5CdmMzUmhiRjlqYjJSbElqb2lUa0VpTENKbGVIUnlZVjlrWlhOamNtbHdkR2x2YmlJNklrNUJJbjBzSW14dlkydGZiM0prWlhKZmQyaGxibDl3WVdsa0lqcG1ZV3h6WlN3aVpYaDBjbUVpT25zaVlXTmpaWEIwWDI5eVpHVnlYMmxrSWpvMU56azROamcyTWpFc0ltMWxjbU5vWVc1MFgyOXlaR1Z5WDJsa0lqcHVkV3hzZlN3aWNtVmthWEpsWTNScGIyNWZkWEpzSWpvaWFIUjBjSE02THk5amIyOXJhV1V0WW1sMFpTNWpiMjB2WTJobFkydHZkWFF2Y0dGNWJXOWlMWEpsYzNCdmJuTmxJaXdpYzJsdVoyeGxYM0JoZVcxbGJuUmZZWFIwWlcxd2RDSTZabUZzYzJVc0ltTnlaV0YwWldSZllua2lPbTUxYkd3c0ltbHpYM0JoY25SdVpYSWlPbVpoYkhObExDSnVaWGgwWDNCaGVXMWxiblJmYVc1MFpXNTBhVzl1SWpvaWNHbGZkR1Z6ZEY5bVpEWmpPV1EzTW1JelpURTBNamxtT1RJME1UTTFNVFE0T1RjNE56WmhNaUlzSW1WNGNDSTZNVGM0TlRnd01UZzNNMzAua3VstenV2cVRnN1BmUGJhM0c3S25HWWVSOE0tQWlNYzk4VHM4dkJyamY0TDBaSTlkNHl2cFQ5Z0YxZ0JEOUI2OTNuRW9ic3F0SktDbGhYZVlBdGxMb3c=",
      "integration_id": 5777362,
      "redirection_url": "https://cookie-bite.com/checkout/paymob-response",
      "lock_order_when_paid": false,
      "next_payment_intention": "pi_test_fd6c9d72b3e1429f92413514897876a2",
      "single_payment_attempt": false
    },
    "error_occured": false,
    "is_live": false,
    "other_endpoint_reference": null,
    "refunded_amount_cents": 0,
    "refunded_amount_cents_int": 0,
    "source_id": -1,
    "is_captured": false,
    "captured_amount": 0,
    "captured_amount_int": 0,
    "settlement_amount_cents_int": 0,
    "merchant_staff_tag": null,
    "accept_fees_cents_int": 0,
    "vat_cents_int": 0,
    "vat_cents_float": null,
    "updated_at": "2026-08-04T02:06:03.218227",
    "is_settled": false,
    "bill_balanced": false,
    "is_bill": false,
    "owner": 2236192,
    "parent_transaction": null
  };

  const receivedHmac = "cde807e00ca623e5758e346304ed3f8059a58ff00f803bdb242e392dc23c0c14102d043ec69ac8f8b131367459a8faf9beae84ec8e33b39ee96dca374b7c1072";

  console.log('\n=== HMAC Verification for Real Webhook ===\n');
  console.log('Transaction ID:', realTransaction.id);
  console.log('Order ID:', realTransaction.order.id);
  console.log('Success:', realTransaction.success);
  console.log('Amount:', realTransaction.amount_cents, 'cents =', realTransaction.amount_cents / 100, 'EGP');
  console.log('\n---\n');

  const computedHmac = computePaymobTransactionHmac(realTransaction, hmacSecret);

  console.log('Computed HMAC:', computedHmac);
  console.log('Received HMAC:', receivedHmac);
  console.log('\n---\n');

  if (computedHmac.toLowerCase() === receivedHmac.toLowerCase()) {
    console.log('✅ HMAC VERIFICATION SUCCESSFUL!');
    console.log('The webhook is authentic and came from Paymob.');
  } else {
    console.log('❌ HMAC MISMATCH!');
    console.log('The webhook may be forged or HMAC secret is incorrect.');
    console.log('\nPossible causes:');
    console.log('- PAYMOB_HMAC_SECRET is incorrect in .env');
    console.log('- Field order in HMAC computation is wrong');
    console.log('- Using test/live mode mismatch');
  }
}

main();
