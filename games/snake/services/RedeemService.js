export class RedeemService {
  constructor(rewards) { this.rewards = rewards; }
  redeem(code) {
    const normalized = code.trim().toLowerCase();
    const reward = this.rewards.find(item => item.code.trim().toLowerCase() === normalized);
    return reward ? { success:true, rewardType:reward.type, rewardId:reward.id, message:reward.message } : { success:false, message:'兑换内容无效，请重试。' };
  }
}
