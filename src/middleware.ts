import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AUTH_REALM = "FEC Funding Research";

export function middleware(request: NextRequest) {
  const password = process.env.APP_PASSWORD;

  if (!password) {
    return NextResponse.next();
  }

  const username = process.env.APP_USERNAME ?? "researcher";
  const authHeader = request.headers.get("authorization");

  if (isAuthorized(authHeader, username, password)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${AUTH_REALM}", charset="UTF-8"`,
      "Cache-Control": "no-store",
    },
  });
}

function isAuthorized(
  authHeader: string | null,
  username: string,
  password: string,
) {
  if (!authHeader?.startsWith("Basic ")) {
    return false;
  }

  const encodedCredentials = authHeader.slice("Basic ".length);
  const decodedCredentials = atob(encodedCredentials);
  const separatorIndex = decodedCredentials.indexOf(":");

  if (separatorIndex === -1) {
    return false;
  }

  const providedUsername = decodedCredentials.slice(0, separatorIndex);
  const providedPassword = decodedCredentials.slice(separatorIndex + 1);

  return providedUsername === username && providedPassword === password;
}

export const config = {
  matcher: [
    /*
     * Protect application routes while excluding framework assets, common
     * metadata files, and favicon/icon requests.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icon.png).*)",
  ],
};

