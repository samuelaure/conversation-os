const Queue = require('bull');
const queue = new Queue('contact-import', {
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'cos_redis_pass'
  }
});

async function main() {
  const job = await queue.getJob('3');
  if (job) {
    console.log('Retrying job 3...');
    await job.retry();
    console.log('Job 3 retried.');
  } else {
    console.log('Job 3 not found.');
  }
}

main().finally(() => queue.close());
