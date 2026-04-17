#!/bin/bash
# 星夜系统部署脚本
set -e

PROJECT=$1
ACTION=${2:-restart}

if [ -z "$PROJECT" ]; then
  echo "用法: ./deploy.sh <project> [action]"
  echo "项目: investflow, trading-system, reading, diet, all"
  exit 1
fi

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
XINGYE_DIR="$(dirname "$DEPLOY_DIR")"

deploy_project() {
  local proj=$1
  echo "=== 部署 $proj ==="

  case $proj in
    investflow)
      echo "构建前端..."
      cd "$XINGYE_DIR/projects/investflow/frontend"
      npm run build
      echo "同步到 html/investflow..."
      rsync -av --delete dist/ "$XINGYE_DIR/html/investflow/"
      echo "重启后端..."
      pm2 restart investflow
      ;;
    trading-system)
      echo "构建前端..."
      cd "$XINGYE_DIR/projects/trading-system/frontend"
      npm run build
      echo "同步到 html/trading-system..."
      rsync -av --delete dist/ "$XINGYE_DIR/html/trading-system/"
      echo "重启后端..."
      pm2 restart trading-system
      ;;
    reading)
      echo "构建前端..."
      cd "$XINGYE_DIR/projects/reading/frontend"
      npm run build
      echo "同步到 html/reading..."
      rsync -av --delete dist/ "$XINGYE_DIR/html/reading/"
      echo "重启后端..."
      pm2 restart reading
      ;;
    diet)
      echo "重启 diet 后端..."
      pm2 restart diet
      ;;
    *)
      echo "未知项目: $proj"
      return 1
      ;;
  esac

  echo "=== $proj 部署完成 ==="
}

if [ "$PROJECT" = "all" ]; then
  for p in investflow trading-system reading diet; do
    deploy_project $p
  done
  echo "全部部署完成！"
else
  deploy_project $PROJECT
fi

echo "重载 Nginx..."
sudo nginx -s reload
echo "完成！"
