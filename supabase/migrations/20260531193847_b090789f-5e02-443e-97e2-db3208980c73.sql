CREATE POLICY "enrollments_manager_select"
ON public.enrollments
FOR SELECT
TO authenticated
USING (public.manages_seller(auth.uid(), seller_id));