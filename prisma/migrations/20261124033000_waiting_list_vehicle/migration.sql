ALTER TABLE `WaitingListEntry`
  ADD COLUMN `vehicleId` VARCHAR(191) NULL;

CREATE INDEX `WaitingListEntry_vehicleId_idx`
  ON `WaitingListEntry`(`vehicleId`);

ALTER TABLE `WaitingListEntry`
  ADD CONSTRAINT `WaitingListEntry_vehicleId_fkey`
  FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
