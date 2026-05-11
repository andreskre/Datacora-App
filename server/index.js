require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 4000;
const dbPath = path.join(__dirname, 'db.json');
const jwtSecret = process.env.JWT_SECRET || 'datacora-dev-secret';

app.use(cors());
app.use(express.json());

function readDb() {
  const raw = fs.readFileSync(dbPath, 'utf-8');
  return JSON.parse(raw);
}

function writeDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token requerido.' });
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Token invalido o expirado.' });
  }
}

function requireRoles(roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ message: 'No autorizado para esta operacion.' });
    }
    return next();
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'datacora-api' });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const db = readDb();

  const found = db.users.find(
    (user) =>
      user.email.toLowerCase() === String(email || '').toLowerCase().trim() &&
      user.password === password,
  );

  if (!found) {
    return res.status(401).json({ message: 'Credenciales invalidas.' });
  }

  const safeUser = sanitizeUser(found);
  const token = jwt.sign(
    { sub: safeUser.id, role: safeUser.role, email: safeUser.email },
    jwtSecret,
    { expiresIn: '12h' },
  );

  return res.json({ user: safeUser, token });
});

app.get('/users', authRequired, requireRoles(['jefe_mantencion', 'jefe_nacional', 'admin']), (_req, res) => {
  const db = readDb();
  res.json(db.users.map(sanitizeUser));
});

app.get('/questions', authRequired, (_req, res) => {
  const db = readDb();
  res.json(db.questions);
});

app.get('/assignments', authRequired, (req, res) => {
  const db = readDb();
  const role = req.auth.role;
  const userId = req.auth.sub;

  if (role === 'admin' || role === 'jefe_nacional') {
    return res.json(db.assignments);
  }

  if (role === 'jefe_mantencion') {
    return res.json(db.assignments.filter((item) => item.assignedBy === userId));
  }

  if (role === 'tecnico') {
    return res.json(db.assignments.filter((item) => item.assignedTo === userId));
  }

  return res.json([]);
});

app.post('/assignments', authRequired, requireRoles(['jefe_mantencion', 'admin']), (req, res) => {
  const { rbd, establishmentName, establishmentType, assignedTo } = req.body || {};
  const assignedBy = req.auth.sub;

  if (!rbd || !establishmentName || !establishmentType || !assignedTo || !assignedBy) {
    return res.status(400).json({ message: 'Faltan campos obligatorios.' });
  }

  const db = readDb();
  const created = {
    id: `a-${crypto.randomUUID()}`,
    rbd,
    establishmentName,
    establishmentType,
    assignedTo,
    assignedBy,
    status: 'pendiente',
  };

  db.assignments.unshift(created);
  writeDb(db);
  return res.status(201).json(created);
});

app.patch('/assignments/:id/submit', authRequired, (req, res) => {
  const { id } = req.params;
  const { answers } = req.body || {};

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ message: 'Las respuestas son obligatorias.' });
  }

  const db = readDb();
  const index = db.assignments.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ message: 'Asignacion no encontrada.' });
  }

  const current = db.assignments[index];
  const role = req.auth.role;
  const userId = req.auth.sub;
  const canSubmit = role === 'admin' || (role === 'tecnico' && current.assignedTo === userId);

  if (!canSubmit) {
    return res.status(403).json({ message: 'No autorizado para enviar esta bitacora.' });
  }

  db.assignments[index] = {
    ...db.assignments[index],
    status: 'completada',
    answers,
  };

  writeDb(db);
  return res.json(db.assignments[index]);
});

app.get('/auth/me', authRequired, (req, res) => {
  const db = readDb();
  const found = db.users.find((item) => item.id === req.auth.sub);
  if (!found) {
    return res.status(404).json({ message: 'Usuario no encontrado.' });
  }
  return res.json({ user: sanitizeUser(found) });
});

app.listen(port, () => {
  console.log(`Datacora API running on http://localhost:${port}`);
});
