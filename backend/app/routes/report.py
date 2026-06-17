from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import api_bp
from .. import db
from ..models import Report, Product, Notification, User
from datetime import datetime


REPORT_REASONS = [
    '虚假信息',
    '欺诈行为',
    '违禁商品',
    '侵权商品',
    '价格异常',
    '重复发布',
    '其他原因'
]


@api_bp.route('/reports', methods=['POST'])
@jwt_required()
def create_report():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    product_id = data.get('product_id')
    reason = data.get('reason')
    description = data.get('description', '')
    
    if not product_id:
        return jsonify({'error': '商品ID不能为空'}), 400
    
    if not reason:
        return jsonify({'error': '举报原因不能为空'}), 400
    
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': '商品不存在'}), 404
    
    existing_report = Report.query.filter_by(
        reporter_id=user_id,
        product_id=product_id,
        status='pending'
    ).first()
    
    if existing_report:
        return jsonify({'error': '您已举报过该商品，请等待处理'}), 400
    
    report = Report(
        reporter_id=user_id,
        product_id=product_id,
        reason=reason,
        description=description
    )
    db.session.add(report)
    
    admins = User.query.filter_by(is_admin=True).all()
    for admin in admins:
        notification = Notification(
            user_id=admin.id,
            type='report',
            title=f'新举报：{product.title}',
            content=f'用户举报了商品「{product.title}」，原因：{reason}',
            related_id=product.id,
            related_type='product'
        )
        db.session.add(notification)
    
    db.session.commit()
    
    return jsonify({
        'message': '举报成功，我们会尽快处理',
        'report': report.to_dict()
    }), 201


@api_bp.route('/reports', methods=['GET'])
@jwt_required()
def get_reports():
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    
    query = Report.query.filter_by(reporter_id=user_id)
    
    if status:
        query = query.filter_by(status=status)
    
    pagination = query.order_by(Report.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'reports': [r.to_dict() for r in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    })


@api_bp.route('/reports/<int:report_id>', methods=['GET'])
@jwt_required()
def get_report(report_id):
    user_id = int(get_jwt_identity())
    
    report = Report.query.get(report_id)
    
    if not report:
        return jsonify({'error': '举报记录不存在'}), 404
    
    if report.reporter_id != user_id:
        return jsonify({'error': '无权查看此举报'}), 403
    
    return jsonify({
        'report': report.to_dict()
    })


@api_bp.route('/reports/reasons', methods=['GET'])
def get_report_reasons():
    return jsonify({
        'reasons': REPORT_REASONS
    })


@api_bp.route('/admin/reports', methods=['GET'])
@jwt_required()
def admin_get_reports():
    user_id = int(get_jwt_identity())
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    product_id = request.args.get('product_id', type=int)
    
    query = Report.query
    
    if status:
        query = query.filter_by(status=status)
    
    if product_id:
        query = query.filter_by(product_id=product_id)
    
    pagination = query.order_by(Report.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'reports': [r.to_dict() for r in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    })


@api_bp.route('/admin/reports/<int:report_id>/handle', methods=['PUT'])
@jwt_required()
def admin_handle_report(report_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    status = data.get('status')
    result = data.get('result', '')
    
    if status not in ['approved', 'rejected']:
        return jsonify({'error': '无效的处理状态'}), 400
    
    report = Report.query.get(report_id)
    
    if not report:
        return jsonify({'error': '举报记录不存在'}), 404
    
    report.status = status
    report.result = result
    report.handled_by = user_id
    report.handled_at = datetime.utcnow()
    
    if status == 'approved':
        product = Product.query.get(report.product_id)
        if product:
            product.status = 'removed'
    
    notification = Notification(
        user_id=report.reporter_id,
        type='report',
        title=f'举报处理结果：{report.product.title if report.product else "商品"}',
        content=f'您的举报已处理，处理结果：{result}',
        related_id=report.id,
        related_type='report'
    )
    db.session.add(notification)
    
    db.session.commit()
    
    return jsonify({
        'message': '处理成功',
        'report': report.to_dict()
    })