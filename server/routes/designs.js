const express = require("express");
const { z } = require("zod");
const Design = require("../models/Design");
const authMiddleware = require("../middleware/auth");

const designSchema = z.object({
  name: z.string().max(100).optional(),
  room: z
    .object({
      width: z.number().min(1).max(100),
      length: z.number().min(1).max(100),
      shape: z.string().optional(),
      wallColor: z.string().optional(),
      floorColor: z.string().optional(),
    })
    .passthrough(),
  furniture: z.array(z.any()).max(300, "Too many furniture items"),
  thumbnail: z.string().optional(),
});

const router = express.Router();

// ── GET ALL DESIGNS (For the logged-in user) ──────────────────
router.get("/", authMiddleware, async (req, res) => {
  try {
    const designs = await Design.find({ userId: req.user.userId }).sort({
      updatedAt: -1,
    });
    res.json(designs);
  } catch (error) {
    console.error("Error fetching designs:", error);
    res.status(500).json({ error: "Failed to fetch designs" });
  }
});

// ── GET A SINGLE DESIGN ───────────────────────────────────────
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const design = await Design.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (!design) {
      return res.status(404).json({ error: "Design not found" });
    }
    res.json(design);
  } catch (error) {
    console.error("Error fetching design:", error);
    res.status(500).json({ error: "Failed to fetch design" });
  }
});

// ── CREATE A NEW DESIGN ───────────────────────────────────────
router.post("/", authMiddleware, async (req, res) => {
  try {
    const validationResult = designSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res
        .status(400)
        .json({ error: validationResult.error.errors[0].message });
    }
    const { name, room, furniture, thumbnail } = validationResult.data;

    const newDesign = new Design({
      userId: req.user.userId,
      name: name || "Untitled Design",
      room,
      furniture,
      thumbnail,
    });

    const savedDesign = await newDesign.save();
    res.status(201).json(savedDesign);
  } catch (error) {
    console.error("Error saving design:", error);
    res.status(500).json({ error: "Failed to save design" });
  }
});

// ── UPDATE A DESIGN ───────────────────────────────────────────
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const validationResult = designSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res
        .status(400)
        .json({ error: validationResult.error.errors[0].message });
    }
    const { name, room, furniture, thumbnail } = validationResult.data;

    const updatedDesign = await Design.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { name, room, furniture, thumbnail, updatedAt: Date.now() },
      { new: true },
    );

    if (!updatedDesign) {
      return res.status(404).json({ error: "Design not found" });
    }

    res.json(updatedDesign);
  } catch (error) {
    console.error("Error updating design:", error);
    res.status(500).json({ error: "Failed to update design" });
  }
});

// ── RENAME A DESIGN (name only) ──────────────────────────────
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' })
    }
    const updated = await Design.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { name: name.trim().slice(0, 100), updatedAt: Date.now() },
      { new: true }
    )
    if (!updated) return res.status(404).json({ error: 'Design not found' })
    res.json(updated)
  } catch (error) {
    console.error('Error renaming design:', error)
    res.status(500).json({ error: 'Failed to rename design' })
  }
})

// ── DELETE A DESIGN ───────────────────────────────────────────
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const design = await Design.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!design) {
      return res
        .status(404)
        .json({ error: "Design not found or unauthorized" });
    }

    res.json({ message: "Design deleted successfully" });
  } catch (error) {
    console.error("Error deleting design:", error);
    res.status(500).json({ error: "Failed to delete design" });
  }
});

module.exports = router;
