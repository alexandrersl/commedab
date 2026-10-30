import { cssInterop } from 'nativewind';
import Animated from 'react-native-reanimated';

// Les vues animées de Reanimated prennent des classes comme les vues ordinaires.
cssInterop(Animated.View, { className: 'style' });
