-- AlterTable
ALTER TABLE `tasks` ADD COLUMN `dueDate` DATETIME(3) NULL,
    ADD COLUMN `priority` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
    ADD COLUMN `timeSpentSeconds` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `timerStartedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `tasks_dueDate_idx` ON `tasks`(`dueDate`);
