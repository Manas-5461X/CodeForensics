export interface RepositorySyncJobData {
  repositoryId: string;
  owner: string;
  repo: string;
  installationId?: number;
  triggeredBy: string;
}
