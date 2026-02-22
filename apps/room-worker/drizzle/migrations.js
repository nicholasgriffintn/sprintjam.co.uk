import journal from './meta/_journal.json';
import m0000 from './0000_cold_squirrel_girl.sql';
import m0001 from './0001_luxuriant_medusa.sql';
import m0002 from './0002_concerned_lady_vermin.sql';
import m0003 from './0003_stale_moonstone.sql';
import m0004 from './0004_mixed_dragon_lord.sql';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
  },
};
