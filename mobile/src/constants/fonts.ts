import { IBMPlexSansThai_400Regular } from '@expo-google-fonts/ibm-plex-sans-thai/400Regular';
import { IBMPlexSansThai_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-thai/600SemiBold';
import { IBMPlexSansThai_700Bold } from '@expo-google-fonts/ibm-plex-sans-thai/700Bold';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono/400Regular';
import { SpaceMono_700Bold } from '@expo-google-fonts/space-mono/700Bold';

export const fontAssets = {
  IBMPlexSansThai_400Regular,
  IBMPlexSansThai_600SemiBold,
  IBMPlexSansThai_700Bold,
  SpaceMono_400Regular,
  SpaceMono_700Bold,
};

// Each weight is its own family, so never add fontWeight on top of these.
// Space Mono has no Thai glyphs and RN has no fallback stack, so use it for digits and Latin only.
export const fonts = {
  regular: 'IBMPlexSansThai_400Regular',
  semibold: 'IBMPlexSansThai_600SemiBold',
  bold: 'IBMPlexSansThai_700Bold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
};
