import { eventKey } from '~/hooks/useEvent';
import { routeForSystemUrl } from '~/services/deepLink';
import { holdAdminLink } from '~/services/loadEvent';
import { queryClient } from '~/services/queryClient';

/**
 * Runs on every URL from the system, before the router sees it. The admin key leaves the URL here,
 * so it never reaches the route, the navigation state or a log.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const route = routeForSystemUrl(path);
    if (!route) return path;

    if (route.adminKey) {
      const slug = route.href.slice('/e/'.length);
      holdAdminLink(slug, route.adminKey);
      // The event may already be on screen, in which case the route alone would change nothing.
      void queryClient.invalidateQueries({ queryKey: eventKey(slug) });
    }
    return route.href;
  } catch {
    return '/';
  }
}
