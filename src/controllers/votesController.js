// src/controllers/votesController.js
const Vote = require('../models/Vote');
const Location = require('../models/Location');
const Post = require('../models/Post');
const logEvent = require('../utils/logEvent');
const UserActions = require('../utils/UserActions');


const votesController = {

    addOrUpdateVote: async (req, res) => {


        try {
            const { item_type, item_id, value } = req.body;
            const user_id = req.user.firebase_uid; // מגיע מה-authMiddleware

            console.log('--- Start addOrUpdateVote ---');
            console.log('Received payload:', { item_type, item_id, value, user_id }); // <--- זה חיוני

            // 1. ולידציה בסיסית של הקלט
            if (!item_type || !item_id || !Number.isInteger(value) || !['post', 'location'].includes(item_type) || ![-1, 0, 1].includes(value)) {
                console.log('Validation failed: Invalid input parameters.'); // <--- חשוב
                return res.status(400).json({ message: req.t('votes.invalid_input') });
            }
            console.log('Input validation passed.'); // <--- חדש

            // 2. ודא שה-item_id קיים
            let targetModel;
            if (item_type === 'location') {
                targetModel = Location;
            } else if (item_type === 'post') {
                targetModel = Post;
            } else {
                // זה לא אמור לקרות אם הולידציה עובדת, אבל טוב שיהיה ליתר ביטחון
                console.log('Invalid item_type after initial validation.'); // <--- חדש
                return res.status(400).json({ message: req.t('votes.invalid_input') });
            }
            console.log(`Target model identified: ${targetModel.name}`); // <--- חדש

            // וודא ש-targetModel.getById היא פונקציה
            if (typeof targetModel.getById !== 'function') {
                console.error(`Error: targetModel.getById is not a function for ${item_type}.`); // <--- חובה לבדוק
                return res.status(500).json({ message: req.t('votes.error'), error: 'Model getById method missing.' });
            }

            const item = await targetModel.getById(item_id);
            console.log('Result of getById:', item ? 'Item found' : 'Item not found'); // <--- חדש
            if (!item) {
                return res.status(404).json({ message: req.t('votes.item_not_found') });
            }

            // 3. בצע את פעולת ה-UPSERT במודל Vote
            console.log('Attempting Vote.upsert with:', { user_id, item_type, item_id, value }); // <--- חדש
            const { action, delta_like_count } = await Vote.upsert({ user_id, item_type, item_id, value });
            console.log('Vote.upsert returned:', { action, delta_like_count }); // <--- חדש

            let message;
            // 4. עדכן את מונה הלייקים של הפריט רק אם היה שינוי ב-delta_like_count
            if (delta_like_count !== 0) {
                console.log(`Delta like count is ${delta_like_count}. Attempting to update target model.`); // <--- חדש
                if (delta_like_count > 0) {
                    // וודא ש-targetModel.incrementLikeCount היא פונקציה
                    if (typeof targetModel.incrementLikeCount !== 'function') {
                        console.error(`Error: targetModel.incrementLikeCount is not a function for ${item_type}.`); // <--- חובה
                        return res.status(500).json({ message: req.t('votes.error'), error: 'Model incrementLikeCount method missing.' });
                    }
                    await targetModel.incrementLikeCount(item_id, delta_like_count);
                    console.log(`Successfully incremented like count by ${delta_like_count} for ${item_type} ID ${item_id}`); // <--- חדש
                } else if (delta_like_count < 0) {
                    // וודא ש-targetModel.decrementLikeCount היא פונקציה
                    if (typeof targetModel.decrementLikeCount !== 'function') {
                        console.error(`Error: targetModel.decrementLikeCount is not a function for ${item_type}.`); // <--- חובה
                        return res.status(500).json({ message: req.t('votes.error'), error: 'Model decrementLikeCount method missing.' });
                    }
                    await targetModel.decrementLikeCount(item_id, Math.abs(delta_like_count));
                    console.log(`Successfully decremented like count by ${Math.abs(delta_like_count)} for ${item_type} ID ${item_id}`); // <--- חדש
                }
            } else {
                console.log('Delta like count is 0. No update needed for target model.'); // <--- חדש
            }

            // 5. קבע הודעה למשתמש בהתאם לפעולה שבוצעה
            switch (action) {
                case 'inserted':
                    message = req.t('votes.vote_added');
                    break;
                case 'updated':
                    message = req.t('votes.vote_updated');
                    break;
                case 'deleted':
                    message = req.t('votes.vote_removed');
                    break;
                case 'no_change': // אם ההצבעה הייתה זהה לערך הקיים
                    message = req.t('votes.duplicate_vote');
                    break;
                case 'no_action': // אם ערך ה-value הוא 0 ואין הצבעה קיימת
                    message = req.t('votes.no_action');
                    break;
                default:
                    message = req.t('votes.error');
            }

            if (['inserted', 'updated', 'deleted'].includes(action)) {
                await logEvent(
                    action.toUpperCase(), // לדוגמה: "INSERTED" => "INSERTED"
                    `User ${user_id} ${action} vote (${value}) on ${item_type} ${item_id}`,
                    user_id
                );
            }

            await UserActions.trackAction(
                req.user.firebase_uid,
                `vote_${item_type}`, 
                item_type,
                item_id
            );

            console.log('Sending successful response:', message); // <--- חדש
            res.status(200).json({ message });
        } catch (error) {
            console.error('!!!!!!!!!!!!!!!!!!! CAUGHT ERROR IN addOrUpdateVote !!!!!!!!!!!!!!!!!!!'); // <--- יותר בולט
            console.error('Error details:');
            console.error('  Message:', error.message);
            console.error('  Stack:', error.stack);
            console.error('Full error object:', error);
            // אם זו שגיאת SQL, תהיה לה גם תכונת `code` או `errno`
            if (error.code) console.error('  SQL Error Code:', error.code);
            if (error.errno) console.error('  SQL Error Number:', error.errno);
            if (error.sqlMessage) console.error('  SQL Message:', error.sqlMessage);
            if (error.sql) console.error('  SQL Query:', error.sql); // <--- זה ממש חשוב אם זו שגיאת SQL

            res.status(500).json({ message: req.t('votes.error'), error: error.message });
        } finally {
            console.log('--- End addOrUpdateVote (finally block) ---'); // <--- חדש
        }
    },
     deleteVote: async (req, res) => {
    try {
        const { userId, itemType, itemId } = req.params;
        console.log(`[Controller] Request to delete vote for user ${userId} on ${itemType} ${itemId}`);

        // הקונטרולר מפעיל את הפונקציה המתאימה מהמודל
        const affectedRows = await Vote.delete(userId, itemType, itemId);

        if (affectedRows > 0) {
            res.status(200).json({ success: true, message: 'Vote removed successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Vote not found' });
        }

    } catch (error) {
        console.error('Error in votesController.deleteVote:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
};

module.exports = votesController;