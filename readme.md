# Running locally

## Supabase

### Setup

1. Make sure Docker is running. Can you [Docker Desktop](https://docs.docker.com/get-docker/)
2. Run `npx supabase start`
3. Once all of the Supabase services are running, you'll see output containing your local Supabase credentials. It should look like this, with urls and keys that you'll use in your local project:

   ```
   Started supabase local development setup.

           API URL: http://localhost:54321
             DB URL: postgresql://postgres:postgres@localhost:54322/postgres
         Studio URL: http://localhost:54323
       Inbucket URL: http://localhost:54324
           anon key: eyJh......
   service_role key: eyJh......
   ```

4. Create an `.env.local` file based on .env.local.example and fill supabase related variables
5. Run `npx supabase db reset` to setup your local database with the latest migrations

[view more details](https://supabase.com/docs/guides/cli/local-development)

### Stop local server

1. Run `npx supabase stop`

### Apply new migrations to local database

1. Run `npx supabase migration up`

### Reset local database completely

1. Run `npx supabase db reset`

### Create a new migration

1. Run `npx supabase migration new <name>`
2. If you created a new storage bucket you will need to add a seed file entry for it

### Create a new migration based on diffs (if you edited your db using the supabase UI)

1. Run `npx supabase db diff --schema public | npx supabase migration new <name>`

## Website

### Setup

1. Make sure you have followed the supabase steps above
2. Update your `.env.local` file with any missing api keys (e.g. FatSecret and OpenAi)
3. Start your local server by running `npm run dev`

### Creating a new user

When a new user is created, the email must be verified. When running locally emails aren't actually sent, but rather intercepted by inbucket. You can view these emails by going to the inbucket URL displayed after running `npx supabase status`.

### Quick fix

1. missing environment variables: `source .env.local`.
