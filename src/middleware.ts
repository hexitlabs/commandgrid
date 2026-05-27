import { NextResponse, type NextRequest } from "next/server";
import { parseDemoRole } from "@/modules/demo-role/demo-role-storage";
import { demoRoleRequestHeader } from "@/modules/demo-role/request-role-header";

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const queryRole = request.nextUrl.searchParams.get("role");

  if (queryRole) {
    requestHeaders.set(demoRoleRequestHeader, parseDemoRole(queryRole));
  } else {
    requestHeaders.delete(demoRoleRequestHeader);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: ["/", "/dashboard", "/design-system", "/incidents/:path*"]
};
