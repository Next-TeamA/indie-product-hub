"""Workspace file storage -- Supabase Storage wrapper for skill/knowledge files.

Each project has a workspace at: workspaces/{project_id}/
Contains: README.md, skills/*.md, knowledge/*.md, references/*.md
"""

from app.core.supabase import supabase

BUCKET = "workspaces"


class WorkspaceStorage:
    """Read/write workspace files in Supabase Storage."""

    def _path(self, project_id: str, file_path: str) -> str:
        return f"{project_id}/{file_path}"

    async def read_file(self, project_id: str, path: str) -> str | None:
        """Read a text file from workspace. Returns None if not found."""
        try:
            full_path = self._path(project_id, path)
            data = supabase.storage.from_(BUCKET).download(full_path)
            return data.decode("utf-8") if data else None
        except Exception:
            return None

    async def write_file(self, project_id: str, path: str, content: str) -> bool:
        """Write/overwrite a text file in workspace."""
        try:
            full_path = self._path(project_id, path)
            content_bytes = content.encode("utf-8")
            # Try update first (existing file), fall back to upload (new file)
            try:
                supabase.storage.from_(BUCKET).update(
                    full_path, content_bytes,
                    file_options={"content-type": "text/markdown", "upsert": "true"},
                )
            except Exception:
                supabase.storage.from_(BUCKET).upload(
                    full_path, content_bytes,
                    file_options={"content-type": "text/markdown"},
                )
            return True
        except Exception:
            return False

    async def list_files(self, project_id: str, prefix: str = "") -> list[str]:
        """List files under a prefix (e.g. 'skills/')."""
        try:
            full_prefix = self._path(project_id, prefix)
            result = supabase.storage.from_(BUCKET).list(full_prefix)
            return [f["name"] for f in result if f.get("name")]
        except Exception:
            return []

    async def file_exists(self, project_id: str, path: str) -> bool:
        """Check if a workspace file exists."""
        content = await self.read_file(project_id, path)
        return content is not None


# Singleton
workspace_storage = WorkspaceStorage()
