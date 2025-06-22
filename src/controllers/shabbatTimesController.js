// controllers/shabbatTimesController.js
const hebcalService = require('../utils/hebcalService');

/**
 * מחזיר זמני כניסת ויציאת שבת (הדלקת נרות והבדלה) עבור מיקום נתון.
 * פרמטרים נדרשים ב-query: lat, lng, tzid.
 * פרמטרים אופציונליים ב-query: candleLightingOffset, havdalahOffset.
 */
async function getShabbatTimesForLocation(req, res) {
    const { lat, lng, tzid, candleLightingOffset, havdalahOffset } = req.query;

    // וידוא קיום פרמטרים נדרשים
    if (!lat || !lng || !tzid) {
        return res.status(400).json({ error: 'חסרים פרמטרים נדרשים: lat, lng, tzid.' });
    }

    // וידוא תקינות קואורדינטות
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ error: 'קו רוחב או קו אורך לא תקינים.' });
    }

    // הגדרת קזות אופציונליות למנהגים
    let clOffset = 18; // ברירת מחדל
    if (candleLightingOffset !== undefined) {
        const parsedOffset = parseInt(candleLightingOffset);
        if (!isNaN(parsedOffset) && parsedOffset >= 0) {
            clOffset = parsedOffset;
        } else {
            return res.status(400).json({ error: 'candleLightingOffset חייב להיות מספר חיובי.' });
        }
    }

    let havdalahMethod = 'M=on'; // ברירת מחדל: צאת כוכבים
    if (havdalahOffset !== undefined) {
        if (havdalahOffset === 'M=on') {
            havdalahMethod = 'M=on';
        } else {
            const parsedOffset = parseInt(havdalahOffset);
            if (!isNaN(parsedOffset) && parsedOffset >= 0) {
                havdalahMethod = parsedOffset; // מספר דקות
            } else {
                return res.status(400).json({ error: 'havdalahOffset חייב להיות "M=on" או מספר חיובי.' });
            }
        }
    }

    try {
        const shabbatTimes = await hebcalService.getShabbatTimes(latitude, longitude, tzid, clOffset, havdalahMethod);
        return res.status(200).json(shabbatTimes);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

module.exports = {
    getShabbatTimesForLocation
};