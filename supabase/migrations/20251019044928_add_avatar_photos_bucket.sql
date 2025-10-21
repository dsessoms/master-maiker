-- Add storage policy for avatar-photos bucket
CREATE POLICY "Give users authenticated access to avatar folder" ON "storage"."objects" 
FOR INSERT WITH CHECK ((("bucket_id" = 'avatar-photos'::"text") AND ("auth"."role"() = 'authenticated'::"text")));

CREATE POLICY "Give users authenticated read access to avatar folder" ON "storage"."objects" 
FOR SELECT USING ((("bucket_id" = 'avatar-photos'::"text") AND ("auth"."role"() = 'authenticated'::"text")));

CREATE POLICY "Give users authenticated update access to avatar folder" ON "storage"."objects" 
FOR UPDATE USING ((("bucket_id" = 'avatar-photos'::"text") AND ("auth"."role"() = 'authenticated'::"text")));

CREATE POLICY "Give users authenticated delete access to avatar folder" ON "storage"."objects" 
FOR DELETE USING ((("bucket_id" = 'avatar-photos'::"text") AND ("auth"."role"() = 'authenticated'::"text")));
