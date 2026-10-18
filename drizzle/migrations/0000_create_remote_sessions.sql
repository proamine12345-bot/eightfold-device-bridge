-- Sessions de support Ayman Remote : chaque appareil publie un code à 8 chiffres
CREATE TABLE public.remote_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[0-9]{8}$'),
  device_label text NOT NULL DEFAULT 'Appareil',
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online','busy','offline')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX remote_sessions_code_idx ON public.remote_sessions (code);
CREATE INDEX remote_sessions_last_seen_idx ON public.remote_sessions (last_seen_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.remote_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remote_sessions TO authenticated;
GRANT ALL ON public.remote_sessions TO service_role;

ALTER TABLE public.remote_sessions ENABLE ROW LEVEL SECURITY;

-- Aucune donnée personnelle : seuls le code, l'étiquette d'appareil et l'état sont stockés.
CREATE POLICY "Lecture publique des codes de session"
  ON public.remote_sessions FOR SELECT
  USING (true);

CREATE POLICY "Création publique d'une session"
  ON public.remote_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Mise à jour de l'état de session"
  ON public.remote_sessions FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Suppression d'une session"
  ON public.remote_sessions FOR DELETE
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.remote_sessions;