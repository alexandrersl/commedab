// Fixtures du moteur (specs techniques 4.8), dans l'ordre du tableau.
import { parseFixture, type Fixture } from './schema';
import T01 from './T01.json';
import T02 from './T02.json';
import T03 from './T03.json';
import T04 from './T04.json';
import T10 from './T10.json';
import T11 from './T11.json';
import T13 from './T13.json';
import T14 from './T14.json';
import T15 from './T15.json';
import T17 from './T17.json';
import T22 from './T22.json';
import T23 from './T23.json';
import T25 from './T25.json';
import T26 from './T26.json';
import T29 from './T29.json';
import T30 from './T30.json';
import T31 from './T31.json';
import T34 from './T34.json';
import T35 from './T35.json';
import T36 from './T36.json';
import T37 from './T37.json';
import T38 from './T38.json';
import T39 from './T39.json';
import T41 from './T41.json';
import T43 from './T43.json';
import T44 from './T44.json';
import T45 from './T45.json';
import T46 from './T46.json';
import T47 from './T47.json';
import T48 from './T48.json';
import T49 from './T49.json';
import T50 from './T50.json';
import T51 from './T51.json';

export const fixtures: Fixture[] = [
  T01,
  T02,
  T03,
  T04,
  T10,
  T11,
  T13,
  T14,
  T15,
  T17,
  T22,
  T23,
  T25,
  T26,
  T29,
  T30,
  T31,
  T34,
  T35,
  T36,
  T37,
  T38,
  T39,
  T41,
  T43,
  T44,
  T45,
  T46,
  T47,
  T48,
  T49,
  T50,
  T51,
].map(parseFixture);
