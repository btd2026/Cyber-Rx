'use strict';

/**
 * routes/industries — the industry registry that makes CyberRX industry-agnostic.
 *   GET /api/industries        list selectable industries (for the setup form)
 *   GET /api/industries/:id     full profile (processes, tech, regs, questions)
 */

const express = require('express');
const router = express.Router();
const { optionalJWT } = require('../middleware/auth');
const Industry = require('../data/industryProfiles');

router.get('/', optionalJWT, (req, res) => {
  res.json({ industries: Industry.listIndustries(), default: Industry.DEFAULT_INDUSTRY });
});

router.get('/:id', optionalJWT, (req, res) => {
  const p = Industry.getProfile(req.params.id);
  res.json({
    id: p.id, name: p.name, icon: p.icon, crownJewelData: p.crownJewelData,
    regulations: p.regulations, keyProcesses: p.keyProcesses, techCategories: p.techCategories,
    intakeQuestions: p.intakeQuestions || [],
  });
});

module.exports = router;
