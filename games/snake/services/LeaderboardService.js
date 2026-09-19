export class LeaderboardService {
  async submitRun(result) { return { accepted:false, queued:false, result }; }
  async getLeaderboard() { return []; }
}
