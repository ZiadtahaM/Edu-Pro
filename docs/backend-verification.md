# Edu-Pro Backend Verification Guide

This guide separates **local contract verification** from **real integration verification**. The restored Edu-Pro service is a NestJS application backed by MongoDB and currently exposes `/users`, `/mentors`, and `/categories`. The full-stack portal calls that service through the server-side tRPC bridge; the browser never receives the backend base URL or database credentials.

## 1. MongoDB connectivity

Set a non-production connection string in the backend environment and keep credentials outside source control:

```bash
export MONGODB_URI='mongodb://127.0.0.1:27017/edu_pro_test'
export PORT=3000
```

The application should read the URI from configuration rather than hard-code it. A minimal NestJS bootstrap check is:

```ts
const connection = await mongoose.connect(process.env.MONGODB_URI!, {
  serverSelectionTimeoutMS: 5_000,
});
await connection.connection.db.admin().ping();
console.info('MongoDB ping passed');
await connection.disconnect();
```

Run the backend and verify the process remains healthy:

```bash
npm run build
npm run start:dev
curl --fail http://localhost:3000/categories
curl --fail 'http://localhost:3000/users?page=1&limit=20'
curl --fail 'http://localhost:3000/mentors?page=1&limit=20'
```

The required evidence is a successful `ping`, a successful read from each collection-backed route, and a clean shutdown or restart. A successful TypeScript build alone does not prove MongoDB connectivity.

## 2. JWT and authentication middleware

The current REST source validates request bodies and query parameters with `ValidationPipe`; authentication policy must be supplied by the deployment boundary or added as a NestJS guard. A JWT guard should reject missing, malformed, expired, and incorrectly signed tokens before controller execution:

```ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: { sub: string; role: 'user' | 'admin' }) {
    return { id: payload.sub, role: payload.role };
  }
}
```

Smoke-test the boundary with a valid test token, an expired token, a token signed with the wrong secret, and no token:

```bash
curl -i http://localhost:3000/users
curl -i -H "Authorization: Bearer $VALID_TEST_JWT" http://localhost:3000/users
curl -i -H "Authorization: Bearer $EXPIRED_TEST_JWT" http://localhost:3000/users
curl -i -H "Authorization: Bearer $WRONG_SIGNATURE_JWT" http://localhost:3000/users
```

Expected behavior must be documented per route. At minimum, protected list, update, and delete operations should return `401` for absent/invalid credentials; admin-only delete operations should return `403` for a valid non-admin user. Do not use a production token in local tests.

## 3. Rate limiting

The recommended NestJS implementation uses `@nestjs/throttler`. Install it in the backend project, register a conservative global limit, and override expensive or sensitive routes when necessary:

```bash
npm install @nestjs/throttler
```

```ts
@Module({
  imports: [
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 60 },
    ]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
```

For login, bulk mutation, or admin routes, use a stricter policy:

```ts
@Throttle({ default: { ttl: 60_000, limit: 10 } })
@Post()
create(@Body() dto: CreateUserDto) {
  return this.usersService.create(dto);
}
```

Verify the limit with a loop against a disposable test instance:

```bash
for i in $(seq 1 70); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/categories
done | sort | uniq -c
```

The evidence should show normal responses until the configured threshold and `429 Too Many Requests` afterward. Repeat from the deployment’s real proxy path because reverse proxies can change client-IP handling. Configure a trusted proxy policy before relying on IP-based throttling.

## Verification matrix

| Area | Local evidence | Still required for full integration confidence |
|---|---|---|
| MongoDB | Build, ping, and route reads against a disposable database | Managed MongoDB credentials, indexes, replica/failover behavior, and production telemetry |
| JWT/auth | Four-token smoke matrix and `401`/`403` assertions | Real identity provider, key rotation, refresh/revocation policy, and role provisioning |
| Rate limiting | Repeated-request script with expected `429` threshold | Proxy-aware production test, distributed limiter storage, and abuse monitoring |
| tRPC bridge | Zod validation and server-side timeout/error mapping | A reachable Edu-Pro API URL configured as `EDU_PRO_API_URL` |

No production database, JWT, or API secret should be placed in this project archive or Postman collection.

## 4. Current evidence status

The current source checkpoint includes the global `ThrottlerGuard`, a five-second MongoDB server-selection timeout, typed tRPC timeout/error mapping, and eight bridge tests covering successful users/mentors/categories responses, REST failure mapping, validation rejection, and the admin gate. Edu-Pro’s local build and Jest suite pass. The mobile browser review covers `/`, `/app`, `/app/mentors`, and `/app/profile` at 390×844.

The following checks remain deployment-gated rather than source-gated: a real MongoDB ping and collection read require `MONGODB_URI`; JWT 401/403 behavior requires an actual auth guard/issuer and test tokens; and a proxy-aware 429 test requires a running backend reachable through its deployment path. These checks must be run by the operator with disposable credentials before production launch. The archive intentionally does not claim those external results.

## 5. Accessibility and security review checklist

The local UI review verified visible keyboard focus styling, labeled profile inputs, a labeled category filter, semantic table headers and caption, admin route gating, responsive mobile layout, reduced-motion CSS, and explicit loading/empty/error states. Before production launch, run an automated axe scan against the deployed URL, verify keyboard traversal through the sidebar/drawer/table actions, confirm secure cookie attributes, test CORS origins, validate JWT issuer/audience/key rotation, and repeat the throttling test through the real reverse proxy.
