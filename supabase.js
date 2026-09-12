import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://bwcedbvrbqdeawblxfbn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4HbTw0eAsUug7tHU5W_YHg_6rQ37qkk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
