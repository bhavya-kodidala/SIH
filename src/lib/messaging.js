/**
 * SMS & WhatsApp Emergency Alert Dispatching
 * Formats distress messages with exact live coordinates and Google Maps links.
 */

function formatMapsLink(lat, lng) {
  if (lat == null || lng == null) return "Location unavailable";
  return `https://maps.google.com/?q=${lat},${lng}`;
}

/** Generate standardized SOS text */
export function generateSosMessage({ category, location, phone }) {
  const cat = category?.label || "Emergency";
  const locName = location?.label || "Unknown address";
  const mapsUrl = formatMapsLink(location?.lat, location?.lng);
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    `🚨 *EMERGENCY SOS ALERT — RAKSHANET* 🚨\n\n` +
    `⚠️ *Emergency Type:* ${cat.toUpperCase()}\n` +
    `📍 *Location:* ${locName}\n` +
    `🗺️ *Live GPS Map:* ${mapsUrl}\n` +
    `⏰ *Time:* ${time}\n` +
    (phone ? `📞 *Sender Phone:* +91 ${phone}\n` : "") +
    `\n*Please dispatch immediate assistance!*`
  );
}

/** Generate standardized Report text */
export function generateReportMessage({ id, type, severity, description, location }) {
  const typeLabel = type?.label || "Emergency Incident";
  const sevLabel = (severity || "Medium").toUpperCase();
  const locName = location?.label || "Field location";
  const mapsUrl = formatMapsLink(location?.lat, location?.lng);

  return (
    `📋 *RAKSHANET DISASTER INCIDENT REPORT [${id}]*\n\n` +
    `📌 *Type:* ${typeLabel}\n` +
    `⚡ *Severity:* ${sevLabel}\n` +
    `📍 *Location:* ${locName}\n` +
    `🗺️ *GPS Link:* ${mapsUrl}\n` +
    `📝 *Details:* ${description || "No additional notes"}\n\n` +
    `Report filed through RakshaNet Response Network.`
  );
}

/** Clean phone number for WhatsApp / SMS */
function cleanPhoneNumber(phone) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  // If 10 digits (Indian standard), prepend 91
  if (digits.length === 10) return "91" + digits;
  return digits;
}

/** Open WhatsApp with pre-filled message */
export function openWhatsApp(phone, message) {
  const cleaned = cleanPhoneNumber(phone);
  const encoded = encodeURIComponent(message);
  const url = cleaned
    ? `https://api.whatsapp.com/send?phone=${cleaned}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Open native SMS app with pre-filled message */
export function openSms(phone, message) {
  const cleaned = cleanPhoneNumber(phone);
  const encoded = encodeURIComponent(message);
  // Support both iOS and Android SMS URL patterns
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const delimiter = isIOS ? "&" : "?";
  const url = cleaned
    ? `sms:${cleaned}${delimiter}body=${encoded}`
    : `sms:${delimiter}body=${encoded}`;
  window.location.href = url;
}

/** Blast distress message to all saved contacts sequentially */
export function blastWhatsAppToContacts(contacts, message) {
  if (!contacts || !contacts.length) {
    openWhatsApp(null, message);
    return;
  }
  // Open primary or first contact directly
  const primary = contacts.find((c) => c.primary) || contacts[0];
  openWhatsApp(primary.phone, message);
}
