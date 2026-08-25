const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function randomFrom(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateTemporaryPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const special = "!#$%&*.?";
  const all = upper + lower + numbers + special;
  const chars = [randomFrom(upper), randomFrom(lower), randomFrom(numbers), randomFrom(special)];
  while (chars.length < 12) chars.push(randomFrom(all));
  return chars.sort(() => Math.random() - 0.5).join("");
}

function isValidPassword(password) {
  return String(password || "").length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /[0-9]/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRut(value) {
  return String(value || "").replace(/[.\-\s]/g, "").toUpperCase();
}

function formatRut(value) {
  const normalized = normalizeRut(value).slice(0, 9);
  if (normalized.length <= 1) return normalized;
  const body = normalized.slice(0, -1);
  const checkDigit = normalized.slice(-1);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${checkDigit}`;
}

function isValidRut(value) {
  const normalized = normalizeRut(value);
  if (!/^\d{7,8}[\dK]$/.test(normalized)) return false;
  const body = normalized.slice(0, -1);
  const checkDigit = normalized.slice(-1);
  let multiplier = 2;
  let sum = 0;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const expectedValue = 11 - (sum % 11);
  const expectedDigit = expectedValue === 11 ? "0" : expectedValue === 10 ? "K" : String(expectedValue);
  return checkDigit === expectedDigit;
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signSession(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET no configurado.");
  return jwt.sign({
    sub: user.id,
    email: user.email,
    roleId: user.roleId,
    branchId: user.branchId
  }, secret, { expiresIn: "14h", jwtid: crypto.randomUUID() });
}

function verifySession(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET no configurado.");
  return jwt.verify(token, secret);
}

module.exports = {
  generateTemporaryPassword,
  isValidPassword,
  normalizeEmail,
  formatRut,
  isValidRut,
  hashPassword,
  comparePassword,
  signSession,
  verifySession
};
