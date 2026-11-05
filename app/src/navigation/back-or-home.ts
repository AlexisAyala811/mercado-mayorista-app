type BackNavigation = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: '/home') => void;
};
export function backOrHome(router: BackNavigation) {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}
