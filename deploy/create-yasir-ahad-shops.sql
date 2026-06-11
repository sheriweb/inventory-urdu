-- Create Yasir & Ahad shops (run in phpMyAdmin or: mysql ... < this file)
-- Passwords: Yasir@2026! and Ahad@2026!

SET @yasir_user = UUID();
SET @ahad_user = UUID();
SET @yasir_shop = UUID();
SET @ahad_shop = UUID();

INSERT INTO users (id, email, password, name, role, isActive, createdAt, updatedAt)
VALUES
  (@yasir_user, 'yasir@qistpro.shop', '$2a$12$Xt3kr.OeoLkZV35VLy/.gufrfbQm0NgdVGxtYUTYXA16B6K6DstvO', 'Yasir', 'SHOP_OWNER', 1, NOW(), NOW()),
  (@ahad_user, 'ahad@qistpro.shop', '$2a$12$RpZdwT14x6Yolu1gY0BWQee.aGt2bvP79lKh/jZhaCcNOJu0j5Wzu', 'Ahad', 'SHOP_OWNER', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  name = VALUES(name),
  role = VALUES(role),
  isActive = 1,
  updatedAt = NOW();

SELECT id INTO @yasir_user FROM users WHERE email = 'yasir@qistpro.shop' LIMIT 1;
SELECT id INTO @ahad_user FROM users WHERE email = 'ahad@qistpro.shop' LIMIT 1;

INSERT INTO shops (id, name, ownerId, isActive, reminderEnabled, reminderDaysBefore, autoRoznamchaOnCollection, brandColor, createdAt, updatedAt)
VALUES
  (@yasir_shop, 'Yasir Shop', @yasir_user, 1, 1, 2, 1, '#059669', NOW(), NOW()),
  (@ahad_shop, 'Ahad Shop', @ahad_user, 1, 1, 2, 1, '#059669', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  isActive = 1,
  updatedAt = NOW();

SELECT id INTO @yasir_shop FROM shops WHERE ownerId = @yasir_user LIMIT 1;
SELECT id INTO @ahad_shop FROM shops WHERE ownerId = @ahad_user LIMIT 1;

UPDATE users SET shopId = @yasir_shop WHERE id = @yasir_user;
UPDATE users SET shopId = @ahad_shop WHERE id = @ahad_user;

SELECT u.email, u.name, s.name AS shop_name FROM users u
JOIN shops s ON s.ownerId = u.id
WHERE u.email IN ('yasir@qistpro.shop', 'ahad@qistpro.shop');
