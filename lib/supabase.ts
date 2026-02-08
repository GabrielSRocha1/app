
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabaseUrl = 'https://rpwqlztoprxkryunjfar.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3FsenRvcHJ4a3J5dW5qZmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTU2NzQsImV4cCI6MjA4NjEzMTY3NH0.8S-K2-NOUPDTXbUCBy-zYfWemE6DxAXT9cxp2mbPevE';

export const supabase = createClient(supabaseUrl, supabaseKey);
