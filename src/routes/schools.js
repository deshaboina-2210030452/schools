import express from 'express';
import pool from '../db.js';
import { body, query, validationResult } from 'express-validator';

const router = express.Router();

router.post(
  '/addSchool',
  [
    body('name').isString().trim().notEmpty().isLength({ max: 255 }),
    body('address').isString().trim().notEmpty().isLength({ max: 500 }),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { name, address, latitude, longitude } = req.body;

    try {
      const [result] = await pool.execute(
        `INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)`,
        [name, address, latitude, longitude]
      );
      return res.status(201).json({
        id: result.insertId,
        name,
        address,
        latitude: Number(latitude),
        longitude: Number(longitude)
      });
    } catch (err) {
      console.error('DB insert error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }
);


router.get(
  '/listSchools',
  [
    query('lat').exists().toFloat().isFloat({ min: -90, max: 90 }),
    query('lng').exists().toFloat().isFloat({ min: -180, max: 180 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { lat, lng } = req.query;

    const sql = `
      SELECT
        id, name, address, latitude, longitude,
        (6371 * ACOS(
          LEAST(1, GREATEST(-1,
            COS(RADIANS(?)) * COS(RADIANS(latitude)) * COS(RADIANS(longitude) - RADIANS(?)) +
            SIN(RADIANS(?)) * SIN(RADIANS(latitude))
          ))
        )) AS distance_km
      FROM schools
      ORDER BY distance_km ASC;
    `;

    try {
      const [rows] = await pool.execute(sql, [lat, lng, lat]);
      return res.json(rows);
    } catch (err) {
      console.error('DB select error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }
);

export default router;
