declare const journal: {
  version: string;
  dialect: string;
  entries: Array<{
    idx: number;
    version: string;
    when: number;
    tag: string;
    breakpoints: boolean;
  }>;
};

declare const migrations: {
  [key: string]: string;
};

declare const migrationsConfig: {
  journal: typeof journal;
  migrations: typeof migrations;
};

export default migrationsConfig;
