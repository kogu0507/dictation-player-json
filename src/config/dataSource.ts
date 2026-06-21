const DEVELOPMENT_DATA_BASE_URL = "./testdata/melody";
const PRODUCTION_DATA_BASE_URL = "/data/dictation/melody";

export const DATA_BASE_URL = import.meta.env.DEV
  ? DEVELOPMENT_DATA_BASE_URL
  : PRODUCTION_DATA_BASE_URL;
