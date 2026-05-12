const express = require('express');
const router = express.Router();
const AboutCollege = require('../models/AboutCollege');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
    try {
        let about = await AboutCollege.findOne();
        if (!about) {
            about = new AboutCollege();
            await about.save();
        }
        res.json({ success: true, about });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/', protect, authorize('admin'), async (req, res) => {
    try {
        let about = await AboutCollege.findOne();
        if (!about) {
            about = new AboutCollege();
        }
        Object.assign(about, req.body);
        await about.save();
        res.json({ success: true, about });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;