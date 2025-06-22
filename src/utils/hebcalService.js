// utils/hebcalService.js
const axios = require('axios');

const HEBCAL_API_BASE_URL = 'https://www.hebcal.com/shabbat';

/**
 * פונקציה לשליפת זמני כניסת שבת (הדלקת נרות) ויציאת שבת (הבדלה) מ-Hebcal API.
 * @param {number} latitude - קו רוחב של המיקום.
 * @param {number} longitude - קו אורך של המיקום.
 * @param {string} tzid - מזהה אזור זמן (לדוגמה: "Asia/Jerusalem", "America/New_York").
 * @param {number} [candleLightingOffset=18] - מספר דקות לפני השקיעה להדלקת נרות (ברירת מחדל: 18).
 * @param {string} [havdalahOffset='M=on'] - קביעת זמן הבדלה. 'M=on' לצאת כוכבים, או מספר דקות אחרי השקיעה (לדוגמה: '42', '50', '72').
 * @returns {Promise<Object>} אובייקט המכיל את זמני ההדלקה וההבדלה, או שגיאה.
 */
async function getShabbatTimes(latitude, longitude, tzid, candleLightingOffset = 18, havdalahOffset = 'M=on') {
    try {
        // בניית פרמטרי הקריאה ל-API
        const params = {
            cfg: 'json', // פורמט תגובה JSON
            latitude: latitude,
            longitude: longitude,
            tzid: tzid,
            b: candleLightingOffset, // דקות להדלקת נרות
        };

        // הוספת פרמטר הבדלה בהתאם לסוג
        if (havdalahOffset === 'M=on') {
            params.M = 'on'; // צאת כוכבים
        } else if (typeof havdalahOffset === 'number' && havdalahOffset >= 0) {
            params.m = havdalahOffset; // דקות קבועות לאחר השקיעה
        }

        // ביצוע הבקשה ל-Hebcal API
        const response = await axios.get(HEBCAL_API_BASE_URL, { params });

        // בדיקה אם התגובה מכילה שגיאה
        if (response.data.error) {
            throw new Error(response.data.error);
        }

        const items = response.data.items;
        let candleLighting = null;
        let havdalah = null;

        // חילוץ זמני הדלקה והבדלה מהתגובה
        for (const item of items) {
            if (item.category === 'candles' && item.title.includes('Candle lighting')) {
                candleLighting = item.date; // התאריך והשעה מגיעים כסטרינג ISO
            } else if (item.category === 'havdalah' && item.title.includes('Havdalah')) {
                havdalah = item.date; // התאריך והשעה מגיעים כסטרינג ISO
            }
        }

        if (!candleLighting && !havdalah) {
            return { message: "לא נמצאו זמני שבת עבור המיקום והתאריכים הנוכחיים.", data: null };
        }

        return {
            candleLighting: candleLighting ? new Date(candleLighting).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
            havdalah: havdalah ? new Date(havdalah).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
            date: response.data.date, // תאריך החישוב
            location: response.data.location // פרטי המיקום מה-API
        };

    } catch (error) {
        console.error('Error fetching Shabbat times from Hebcal:', error.message || error);
        throw new Error(`Failed to fetch Shabbat times: ${error.response ? error.response.data : error.message}`);
    }
}

module.exports = {
    getShabbatTimes
};