import { EGYPT_GOVERNORATES, EGYPT_CITIES_BY_GOVERNORATE } from "./egyptLocations";

/**
 * Mapping from Nominatim/OpenStreetMap governorate names to standard Arabic names
 */
export const NOMINATIM_TO_STANDARD: Record<string, string> = {
  // Cairo
  "Cairo": "القاهرة",
  "Cairo Governorate": "القاهرة",
  "Al Qahirah": "القاهرة",
  "Al Qāhirah": "القاهرة",
  "El Qahira": "القاهرة",
  
  // Giza
  "Giza": "الجيزة",
  "Giza Governorate": "الجيزة",
  "Al Jizah": "الجيزة",
  "El Giza": "الجيزة",
  "Jizah": "الجيزة",
  
  // Alexandria
  "Alexandria": "الإسكندرية",
  "Alexandria Governorate": "الإسكندرية",
  "Al Iskandariyah": "الإسكندرية",
  "Al Iskandarīyah": "الإسكندرية",
  "El Iskandaria": "الإسكندرية",
  
  // Dakahlia
  "Dakahlia": "الدقهلية",
  "Dakahlia Governorate": "الدقهلية",
  "Al Daqahliyah": "الدقهلية",
  "Al Daqahlīyah": "الدقهلية",
  "El Dakahlia": "الدقهلية",
  
  // Sharqia
  "Sharqia": "الشرقية",
  "Sharqia Governorate": "الشرقية",
  "Ash Sharqiyah": "الشرقية",
  "Ash Sharqīyah": "الشرقية",
  "El Sharqia": "الشرقية",
  
  // Monufia
  "Monufia": "المنوفية",
  "Monufia Governorate": "المنوفية",
  "Al Minufiyah": "المنوفية",
  "Al Minūfīyah": "المنوفية",
  "El Menofia": "المنوفية",
  
  // Qalyubia
  "Qalyubia": "القليوبية",
  "Qalyubia Governorate": "القليوبية",
  "Al Qalyubiyah": "القليوبية",
  "Al Qalyūbīyah": "القليوبية",
  "El Qalyubia": "القليوبية",
  
  // Gharbia
  "Gharbia": "الغربية",
  "Gharbia Governorate": "الغربية",
  "Al Gharbiyah": "الغربية",
  "Al Gharbīyah": "الغربية",
  "El Gharbia": "الغربية",
  
  // Beheira
  "Beheira": "البحيرة",
  "Beheira Governorate": "البحيرة",
  "Al Buhayrah": "البحيرة",
  "Al Buḩayrah": "البحيرة",
  "El Beheira": "البحيرة",
  
  // Port Said
  "Port Said": "بورسعيد",
  "Port Said Governorate": "بورسعيد",
  "Bur Sa'id": "بورسعيد",
  "Būr Sa'īd": "بورسعيد",
  
  // Damietta
  "Damietta": "دمياط",
  "Damietta Governorate": "دمياط",
  "Dumyat": "دمياط",
  "Dumyāţ": "دمياط",
  
  // Ismailia
  "Ismailia": "الإسماعيلية",
  "Ismailia Governorate": "الإسماعيلية",
  "Al Isma'iliyah": "الإسماعيلية",
  "Al Ismā'īlīyah": "الإسماعيلية",
  "El Ismailia": "الإسماعيلية",
  
  // Suez
  "Suez": "السويس",
  "Suez Governorate": "السويس",
  "As Suways": "السويس",
  "Asways": "السويس",
  
  // Kafr El Sheikh
  "Kafr El Sheikh": "كفر الشيخ",
  "Kafr El Sheikh Governorate": "كفر الشيخ",
  "Kafr ash Shaykh": "كفر الشيخ",
  "Kafr ElSheikh": "كفر الشيخ",
  
  // Fayoum
  "Fayoum": "الفيوم",
  "Fayoum Governorate": "الفيوم",
  "Al Fayyum": "الفيوم",
  "Al Fayyūm": "الفيوم",
  "El Fayoum": "الفيوم",
  
  // Beni Suef
  "Beni Suef": "بني سويف",
  "Beni Suef Governorate": "بني سويف",
  "Bani Suwayf": "بني سويف",
  "Banī Suwayf": "بني سويف",
  
  // Minya
  "Minya": "المنيا",
  "Minya Governorate": "المنيا",
  "Al Minya": "المنيا",
  "Al Minyā": "المنيا",
  "El Minya": "المنيا",
  
  // Assiut
  "Assiut": "أسيوط",
  "Assiut Governorate": "أسيوط",
  "Asyut": "أسيوط",
  "Asyūṭ": "أسيوط",
  
  // Sohag
  "Sohag": "سوهاج",
  "Sohag Governorate": "سوهاج",
  "Suhaj": "سوهاج",
  "Suhāj": "سوهاج",
  
  // Qena
  "Qena": "قنا",
  "Qena Governorate": "قنا",
  "Qina": "قنا",
  "Qinā": "قنا",
  
  // Luxor
  "Luxor": "الأقصر",
  "Luxor Governorate": "الأقصر",
  "Al Uqsur": "الأقصر",
  "Al Uqṣur": "الأقصر",
  
  // Aswan
  "Aswan": "أسوان",
  "Aswan Governorate": "أسوان",
  "Aswān": "أسوان",
  "Asuan": "أسوان",
  
  // Red Sea
  "Red Sea": "البحر الأحمر",
  "Red Sea Governorate": "البحر الأحمر",
  "Al Bahr al Ahmar": "البحر الأحمر",
  "Al Baḩr al Aḩmar": "البحر الأحمر",
  
  // New Valley
  "New Valley": "الوادي الجديد",
  "New Valley Governorate": "الوادي الجديد",
  "Al Wadi al Jadid": "الوادي الجديد",
  "Al Wādī al Jadīd": "الوادي الجديد",
  
  // Matrouh
  "Matrouh": "مطروح",
  "Matrouh Governorate": "مطروح",
  "Matruh": "مطروح",
  "Maṭrūḥ": "مطروح",
  
  // North Sinai
  "North Sinai": "شمال سيناء",
  "North Sinai Governorate": "شمال سيناء",
  "Shamal Sina": "شمال سيناء",
  "Shamāl Sīnā'": "شمال سيناء",
  
  // South Sinai
  "South Sinai": "جنوب سيناء",
  "South Sinai Governorate": "جنوب سيناء",
  "Janub Sina": "جنوب سيناء",
  "Janūb Sīnā'": "جنوب سيناء",
};

/**
 * Match a Nominatim governorate name to the standard Arabic name
 */
export function matchGovernorate(nominatimName: string): string | null {
  if (!nominatimName) return null;
  
  const trimmed = nominatimName.trim();
  
  // Direct match in mapping
  if (NOMINATIM_TO_STANDARD[trimmed]) {
    return NOMINATIM_TO_STANDARD[trimmed];
  }
  
  // Case-insensitive match
  const lowerKey = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(NOMINATIM_TO_STANDARD)) {
    if (key.toLowerCase() === lowerKey) {
      return value;
    }
  }
  
  // Check if it's already a standard Arabic name
  if (EGYPT_GOVERNORATES.includes(trimmed)) {
    return trimmed;
  }
  
  return null;
}

/**
 * Match a Nominatim city name to the standard Arabic name
 * This depends on the governorate context for accurate matching
 */
export function matchCity(nominatimCityName: string, governorate?: string): string | null {
  if (!nominatimCityName) return null;
  
  const trimmed = nominatimCityName.trim();
  
  // If governorate is provided, search within that governorate's cities
  if (governorate) {
    const standardGov = matchGovernorate(governorate) || governorate;
    const cities = EGYPT_CITIES_BY_GOVERNORATE[standardGov] || [];
    
    // Direct match
    if (cities.includes(trimmed)) {
      return trimmed;
    }
    
    // Case-insensitive match
    const lowerTrimmed = trimmed.toLowerCase();
    const match = cities.find(
      (city) => city.toLowerCase() === lowerTrimmed
    );
    if (match) return match;
    
    // Partial match (contains)
    const partialMatch = cities.find(
      (city) => city.toLowerCase().includes(lowerTrimmed) || 
                lowerTrimmed.includes(city.toLowerCase())
    );
    if (partialMatch) return partialMatch;
  }
  
  // If no governorate context, search all cities
  for (const cities of Object.values(EGYPT_CITIES_BY_GOVERNORATE)) {
    if (cities.includes(trimmed)) {
      return trimmed;
    }
    
    const lowerTrimmed = trimmed.toLowerCase();
    const match = cities.find(
      (city) => city.toLowerCase() === lowerTrimmed
    );
    if (match) return match;
  }
  
  return null;
}

/**
 * Get a user-friendly message when location auto-detection fails to match
 */
export function getAutoDetectMessage(): string {
  return "تم تحديد الموقع تلقائياً، يرجى تأكيد المحافظة والمنطقة من القائمة";
}
