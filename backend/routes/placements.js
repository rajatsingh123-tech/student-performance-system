const express = require('express');
const router = express.Router();
const Placement = require('../models/Placement');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
    try {
        const placements = await Placement.find().sort({ date: -1 });
        res.json({ success: true, placements });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const placement = new Placement({ ...req.body, createdBy: req.user.id });
        await placement.save();
        res.json({ success: true, placement });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const placement = await Placement.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, placement });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        await Placement.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;