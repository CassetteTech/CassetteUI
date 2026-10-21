// iOS opens these paths in the Cassette app when it is installed; every other path stays on the web.
// The first matching component wins, so the web-only profile editor is excluded before the profiles.
const appleAppSiteAssociation = {
  applinks: {
    details: [
      {
        appIDs: ['9LYHZBVHB7.com.matttoppi.CassetteApp'],
        components: [
          { '/': '/profile/edit', exclude: true },
          { '/': '/profile/edit/*', exclude: true },
          { '/': '/profile/?*' },
          { '/': '/post/?*' },
          { '/': '/memberships' },
          { '/': '/feed' },
        ],
      },
    ],
  },
};

export const dynamic = 'force-static';

export function GET() {
  return Response.json(appleAppSiteAssociation);
}
