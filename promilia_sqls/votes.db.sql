DELETE from daily_counts ;

DELETE from ballot_items ;

DELETE from ballots ;

DELETE from fingerprint_ballots ;

PRAGMA wal_checkpoint(PASSIVE); -- 不阻塞，能做就做
PRAGMA wal_checkpoint(FULL);    -- 阻塞等待所有读事务结束，强制checkpoint
PRAGMA wal_checkpoint(RESTART);
PRAGMA wal_checkpoint(TRUNCATE); -- checkpoint完成后，截断wal文件，缩小文件大小

PRAGMA wal_autocheckpoint = 500; -- 减小页数，更早触发checkpoint
