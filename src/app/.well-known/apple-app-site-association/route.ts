// iOS opens these paths in the Cassette app when it is installed; every other path stays on the web.
// The profile editor is a web page under the profile path, so it is excluded first.
const appleAppSiteAssociation = {
  applinks: {
    details: [
      {
        appIDs: ['9LYHZBVHB7.com.matttoppi.CassetteApp'],
        components: [
          { '/': '/profile/edit', exclude: true },
          { '/': '/profile/*' },
          { '/': '/post/*' },
          { '/': '/memberships' },
          { '/': '/feed' },
        ],
      },
    ],
  },
};

export function GET() {
  return Response.json(appleAppSiteAssociation);
}
