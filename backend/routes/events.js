const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        res.json({ success: true, events });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const event = new Event({ ...req.body, createdBy: req.user.id });
        await event.save();
        res.json({ success: true, event });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, event });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;