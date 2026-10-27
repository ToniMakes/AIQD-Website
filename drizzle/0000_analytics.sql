CREATE TABLE analytics_daily (
  day TEXT NOT NULL,
  event TEXT NOT NULL,
  source TEXT NOT NULL,
  placement TEXT NOT NULL,
  language TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, event, source, placement, language)
);
