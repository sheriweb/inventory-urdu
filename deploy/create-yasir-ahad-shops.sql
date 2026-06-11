-- Seed admin + Yasir & Ahad shops for qistpro.shop
-- Admin: admin@sheriweb.com / InvUrdu2026!Live
-- Yasir: yasir@qistpro.shop / Yasir@2026!
-- Ahad:  ahad@qistpro.shop / Ahad@2026!

INSERT INTO users (id, email, password, name, role, shopId, isActive, createdAt, updatedAt)
VALUES (UUID(), 'admin@sheriweb.com', '$2a$12$AG0AGvwnt1eokWjkgfhzouhlxGWI6no2OnVxSmsexgek./57JcaHK', 'Super Admin', 'SUPER_ADMIN', NULL, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  name = VALUES(name),
  role = 'SUPER_ADMIN',
  shopId = NULL,
  isActive = 1,
  updatedAt = NOW();

INSERT INTO users (id, email, password, name, role, isActive, createdAt, updatedAt)
VALUES (UUID(), 'yasir@qistpro.shop', '$2a$12$Xt3kr.OeoLkZV35VLy/.gufrfbQm0NgdVGxtYUTYXA16B6K6DstvO', 'Yasir', 'SHOP_OWNER', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  name = VALUES(name),
  role = 'SHOP_OWNER',
  isActive = 1,
  updatedAt = NOW();

INSERT INTO users (id, email, password, name, role, isActive, createdAt, updatedAt)
VALUES (UUID(), 'ahad@qistpro.shop', '$2a$12$RpZdwT14x6Yolu1gY0BWQee.aGt2bvP79lKh/jZhaCcNOJu0j5Wzu', 'Ahad', 'SHOP_OWNER', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  name = VALUES(name),
  role = 'SHOP_OWNER',
  isActive = 1,
  updatedAt = NOW();

SET @yasir_user = (SELECT id FROM users WHERE email = 'yasir@qistpro.shop' LIMIT 1);
SET @ahad_user = (SELECT id FROM users WHERE email = 'ahad@qistpro.shop' LIMIT 1);

INSERT INTO shops (id, name, ownerId, isActive, reminderEnabled, reminderDaysBefore, autoRoznamchaOnCollection, brandColor, createdAt, updatedAt)
VALUES (UUID(), 'Yasir Shop', @yasir_user, 1, 1, 2, 1, '#059669', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = 'Yasir Shop', isActive = 1, updatedAt = NOW();

INSERT INTO shops (id, name, ownerId, isActive, reminderEnabled, reminderDaysBefore, autoRoznamchaOnCollection, brandColor, createdAt, updatedAt)
VALUES (UUID(), 'Ahad Shop', @ahad_user, 1, 1, 2, 1, '#059669', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = 'Ahad Shop', isActive = 1, updatedAt = NOW();

UPDATE users SET shopId = (SELECT id FROM shops WHERE ownerId = @yasir_user LIMIT 1) WHERE id = @yasir_user;
UPDATE users SET shopId = (SELECT id FROM shops WHERE ownerId = @ahad_user LIMIT 1) WHERE id = @ahad_user;

SELECT u.email, u.name, u.role, s.name AS shop_name FROM users u
LEFT JOIN shops s ON s.ownerId = u.id
WHERE u.email IN ('admin@sheriweb.com', 'yasir@qistpro.shop', 'ahad@qistpro.shop');
