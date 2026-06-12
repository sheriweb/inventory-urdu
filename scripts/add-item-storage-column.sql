-- Run once on production if item save fails with unknown column `storage`
ALTER TABLE `Item` ADD COLUMN `storage` VARCHAR(191) NULL AFTER `model`;
