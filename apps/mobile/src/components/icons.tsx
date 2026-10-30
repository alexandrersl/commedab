import {
  Baby,
  Bread,
  Carrot,
  Cheese,
  Cookie,
  Cow,
  DotsThreeCircle,
  Grains,
  HandSoap,
  Snowflake,
  SprayBottle,
  Wine,
  type Icon,
  type IconWeight,
} from 'phosphor-react-native';
import { size as sizes, useTheme, type ColorName } from '../theme';

/** Icône de chaque rayon par défaut, par sa clé (specs techniques 11.2) ; nul : « À classer ». */
const CATEGORY_ICONS: Record<string, Icon> = {
  'hygiene-beaute': HandSoap,
  'bebe-animaux': Baby,
  'entretien-maison': SprayBottle,
  'fruits-legumes': Carrot,
  boulangerie: Bread,
  'epicerie-salee': Grains,
  'epicerie-sucree': Cookie,
  boissons: Wine,
  cremerie: Cheese,
  'viande-poisson-traiteur': Cow,
  surgeles: Snowflake,
};

/** Icône Phosphor en couleur de jeton ; *regular* sauf mention (11.2). */
export function Glyph({
  icon: Component,
  color = 'ink',
  size = sizes.icon,
  weight = 'regular',
}: {
  icon: Icon;
  color?: ColorName;
  size?: number;
  weight?: IconWeight;
}) {
  const { colors } = useTheme();
  return <Component color={colors[color]} size={size} weight={weight} />;
}

export function CategoryIcon({
  categoryKey,
  color = 'ink-muted',
  size = sizes['icon-xs'],
}: {
  categoryKey: string | null;
  color?: ColorName;
  size?: number;
}) {
  const icon = (categoryKey === null ? undefined : CATEGORY_ICONS[categoryKey]) ?? DotsThreeCircle;
  return <Glyph icon={icon} color={color} size={size} />;
}
