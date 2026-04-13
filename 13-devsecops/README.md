# 13. DevSecOps 安全实践 (Bonus)

## 学习目标
将安全集成到 DevOps 流程中，实现安全自动化。

## 核心内容
### 安全集成
- 安全左移 (Shift Left)
- 持续安全
- 安全即代码

### 安全工具
- **SAST** - 静态应用安全测试
- **DAST** - 动态应用安全测试
- **SCA** - 软件成分分析
- **容器安全** - 镜像扫描

### 密钥管理
- **HashiCorp Vault** - 密钥管理
- **AWS Secrets Manager** - 云密钥管理
- **Azure Key Vault** - Azure 密钥管理

### 运行时安全
- **Falco** - 运行时安全
- **Trivy** - 容器漏洞扫描

## 推荐资源
- [OWASP DevSecOps Guideline](https://owasp.org/www-project-devsecops-guideline/) - 免费
- [HashiCorp Vault Documentation](https://developer.hashicorp.com/vault/docs) - 免费
- [Trivy Documentation](https://trivy.dev/latest/) - 免费
- [Falco Runtime Security](https://falco.org/docs/) - 免费

## 实践项目
为一个 CI/CD 流水线添加安全扫描，包括代码扫描和容器镜像扫描。