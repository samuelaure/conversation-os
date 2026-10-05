const Queue = require('bull');
const queue = new Queue('contact-import', {
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'cos_redis_pass'
  }
});

async function main() {
  const active = await queue.getActive();
  const waiting = await queue.getWaiting();
  const failed = await queue.getFailed();
  const completed = await queue.getCompleted();
  console.log('Active:', active.map(j => j.id));
  console.log('Waiting:', waiting.map(j => j.id));
  console.log('Failed:', failed.map(j => ({ id: j.id, reason: j.failedReason })));
  console.log('Completed:', completed.map(j => j.id));
}

main().finally(() => queue.close());
