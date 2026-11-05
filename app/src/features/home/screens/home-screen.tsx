import type { HomeModule } from '@/features/home/components/module-card';
import { ReferenceHomeScreen } from './reference-home-screen';

export type HomeScreenProps = {
  modules: HomeModule[];
  onLogout?: () => void;
  onOpenModule?: (module: HomeModule) => void;
  roleLabel: string;
  userDisplayName: string;
};

export function HomeScreen(props: HomeScreenProps) {
  return <ReferenceHomeScreen {...props} />;
}
