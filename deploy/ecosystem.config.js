module.exports = {
  apps: [
    {
      name: 'daily',
      cwd: '/opt/xingye/projects/daily/backend',
      script: '/usr/bin/python3',
      args: '/opt/xingye/projects/daily/backend/app.py',
      env: {
        FLASK_APP: 'app.py',
        FLASK_ENV: 'production'
      }
    },
    {
      name: 'trading',
      cwd: '/opt/xingye/projects/trading/backend',
      script: '/usr/bin/python3',
      args: '/opt/xingye/projects/trading/backend/app.py',
      env: {
        FLASK_APP: 'app.py',
        FLASK_ENV: 'production'
      }
    },
    {
      name: 'reading',
      cwd: '/opt/xingye/projects/reading',
      script: '/usr/bin/python3',
      args: '/opt/xingye/projects/reading/backend.py',
      env: {
        FLASK_APP: 'backend.py',
        FLASK_ENV: 'production'
      }
    },
    {
      name: 'diet',
      cwd: '/opt/xingye/projects/diet',
      script: '/usr/bin/python3',
      args: '/opt/xingye/projects/diet/app.py',
      env: {
        FLASK_APP: 'app.py',
        FLASK_ENV: 'production'
      }
    },
    {
      name: 'psychology',
      cwd: '/opt/xingye/projects/psychology',
      script: '/usr/bin/python3',
      args: '/opt/xingye/projects/psychology/backend.py',
      env: {
        FLASK_APP: 'backend.py',
        FLASK_ENV: 'production'
      }
    },
    {
      name: 'demo',
      cwd: '/opt/xingye/projects/demo',
      script: '/usr/bin/python3',
      args: '/opt/xingye/projects/demo/app.py',
      env: {
        FLASK_APP: 'app.py',
        FLASK_ENV: 'production'
      }
    }
  ]
};
