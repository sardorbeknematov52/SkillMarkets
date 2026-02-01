from flask import Flask, render_template, request, redirect, url_for, session, flash, abort
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import secrets

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///skillmarket.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 🔑 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Импортируем ЕДИНСТВЕННЫЙ экземпляр db из models.py
# НЕ создаем новый экземпляр здесь!
from models import db, User, Course, Booking, Review, Subscription, Message, PaymentMethod, Transaction, Subject, Schedule, Notification, Favorite

# Инициализируем БД с приложением
db.init_app(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Создание БД
with app.app_context():
    db.create_all()
    
    # Создание демо-предметов
    if Subject.query.count() == 0:
        subjects = [
            Subject(name='Математика', category='science'),
            Subject(name='Физика', category='science'),
            Subject(name='Химия', category='science'),
            Subject(name='Биология', category='science'),
            Subject(name='Русский язык', category='humanities'),
            Subject(name='Литература', category='humanities'),
            Subject(name='История', category='humanities'),
            Subject(name='Английский язык', category='languages'),
            Subject(name='Программирование', category='it'),
            Subject(name='Подготовка к ЕГЭ', category='exam')
        ]
        db.session.add_all(subjects)
        db.session.commit()

# ===== МАРШРУТЫ =====

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    
    tutors = User.query.filter_by(role='tutor').limit(6).all()
    subjects = Subject.query.all()
    return render_template('index.html', tutors=tutors, subjects=subjects)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        role = request.form['role']
        
        if len(password) < 6:
            flash('Пароль должен содержать минимум 6 символов', 'error')
            return redirect(url_for('register'))
        
        if User.query.filter_by(email=email).first():
            flash('Пользователь с таким email уже существует', 'error')
            return redirect(url_for('register'))
        
        hashed_password = generate_password_hash(password)
        user = User(
            username=username,
            email=email,
            password=hashed_password,
            role=role,
            bio=f'Новый {"репетитор" if role == "tutor" else "студент"} на SkillMarket'
        )
        
        db.session.add(user)
        db.session.commit()
        
        session['user_id'] = user.id
        session['username'] = user.username
        session['role'] = user.role
        
        flash(f'Добро пожаловать, {username}!', 'success')
        return redirect(url_for('dashboard'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        
        user = User.query.filter_by(email=email).first()
        
        if user and check_password_hash(user.password, password):
            session['user_id'] = user.id
            session['username'] = user.username
            session['role'] = user.role
            session.permanent = True
            
            flash(f'С возвращением, {user.username}!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Неверный email или пароль', 'error')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('Вы вышли из системы', 'info')
    return redirect(url_for('index'))

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user = User.query.get(session['user_id'])
    
    if user.role == 'student':
        bookings = Booking.query.filter_by(student_id=user.id).order_by(Booking.booking_date.desc()).limit(5).all()
        subscriptions = Subscription.query.filter_by(subscriber_id=user.id).all()
        favorites = Favorite.query.filter_by(student_id=user.id).all()
        tutors_subscribed = [sub.tutor for sub in subscriptions]
        
        return render_template('dashboard.html', 
                             user=user, 
                             bookings=bookings, 
                             subscriptions=tutors_subscribed,
                             favorites=favorites,
                             is_student=True)
    else:
        courses = Course.query.filter_by(tutor_id=user.id).all()
        bookings = Booking.query.filter_by(tutor_id=user.id).order_by(Booking.booking_date.desc()).limit(5).all()
        reviews = Review.query.filter_by(tutor_id=user.id).order_by(Review.created_at.desc()).limit(5).all()
        
        avg_rating = db.session.query(db.func.avg(Review.rating)).filter_by(tutor_id=user.id).scalar()
        
        return render_template('dashboard.html', 
                             user=user, 
                             courses=courses, 
                             bookings=bookings, 
                             reviews=reviews,
                             avg_rating=round(avg_rating, 1) if avg_rating else None,
                             is_student=False)

@app.route('/search')
def search():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    query = request.args.get('q', '')
    search_type = request.args.get('type', 'tutor')
    
    if query:
        if search_type == 'tutor':
            results = User.query.filter(
                User.role == 'tutor',
                (User.username.ilike(f'%{query}%')) | 
                (User.bio.ilike(f'%{query}%'))
            ).all()
        else:
            results = Course.query.filter(
                (Course.title.ilike(f'%{query}%')) | 
                (Course.description.ilike(f'%{query}%')) |
                (Course.subject.ilike(f'%{query}%'))
            ).all()
    else:
        if search_type == 'tutor':
            results = User.query.filter_by(role='tutor').all()
        else:
            results = Course.query.all()
    
    subjects = Subject.query.all()
    return render_template('search.html', results=results, query=query, search_type=search_type, subjects=subjects)

@app.route('/tutor/<int:tutor_id>')
def tutor_profile(tutor_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    tutor = User.query.get_or_404(tutor_id)
    if tutor.role != 'tutor':
        abort(404)
    
    courses = Course.query.filter_by(tutor_id=tutor_id).all()
    reviews = Review.query.filter_by(tutor_id=tutor_id).order_by(Review.created_at.desc()).all()
    avg_rating = db.session.query(db.func.avg(Review.rating)).filter_by(tutor_id=tutor_id).scalar()
    
    is_subscribed = False
    if 'user_id' in session:
        subscription = Subscription.query.filter_by(
            subscriber_id=session['user_id'],
            tutor_id=tutor_id
        ).first()
        is_subscribed = subscription is not None
    
    is_favorite = False
    if 'user_id' in session and session['role'] == 'student':
        favorite = Favorite.query.filter_by(
            student_id=session['user_id'],
            tutor_id=tutor_id
        ).first()
        is_favorite = favorite is not None
    
    return render_template('tutor_profile.html', 
                         tutor=tutor, 
                         courses=courses, 
                         reviews=reviews, 
                         avg_rating=round(avg_rating, 1) if avg_rating else None,
                         is_subscribed=is_subscribed,
                         is_favorite=is_favorite)

@app.route('/course/<int:course_id>')
def course_detail(course_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    course = Course.query.get_or_404(course_id)
    tutor = course.tutor
    
    return render_template('booking.html', course=course, tutor=tutor)

@app.route('/book/<int:course_id>', methods=['POST'])
def book_course(course_id):
    if 'user_id' not in session or session['role'] != 'student':
        flash('Только студенты могут бронировать занятия', 'error')
        return redirect(url_for('login'))
    
    course = Course.query.get_or_404(course_id)
    tutor = course.tutor
    
    booking_date = request.form['booking_date']
    booking_time = request.form['booking_time']
    
    existing_booking = Booking.query.filter_by(
        tutor_id=tutor.id,
        booking_date=datetime.strptime(booking_date, '%Y-%m-%d').date(),
        booking_time=booking_time,
        status='confirmed'
    ).first()
    
    if existing_booking:
        flash('Это время уже занято. Выберите другое время.', 'error')
        return redirect(url_for('course_detail', course_id=course_id))
    
    booking = Booking(
        student_id=session['user_id'],
        tutor_id=tutor.id,
        course_id=course_id,
        booking_date=datetime.strptime(booking_date, '%Y-%m-%d').date(),
        booking_time=booking_time,
        duration=course.duration,
        status='pending'
    )
    
    db.session.add(booking)
    db.session.commit()
    
    notification = Notification(
        user_id=tutor.id,
        title='Новое бронирование',
        message=f'Студент {session["username"]} запросил бронирование занятия "{course.title}" на {booking_date} в {booking_time}',
        type='booking_request',
        related_id=booking.id
    )
    db.session.add(notification)
    db.session.commit()
    
    flash('Запрос на бронирование отправлен репетитору. Ожидайте подтверждения.', 'success')
    return redirect(url_for('dashboard'))

@app.route('/booking/<int:booking_id>/<action>')
def manage_booking(booking_id, action):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    booking = Booking.query.get_or_404(booking_id)
    
    if session['user_id'] != booking.student_id and session['user_id'] != booking.tutor_id:
        abort(403)
    
    if action == 'confirm' and session['user_id'] == booking.tutor_id:
        booking.status = 'confirmed'
        flash('Бронирование подтверждено!', 'success')
        
        notification = Notification(
            user_id=booking.student_id,
            title='Бронирование подтверждено',
            message=f'Репетитор подтвердил ваше занятие "{booking.course.title}" на {booking.booking_date} в {booking.booking_time}',
            type='booking_confirmed',
            related_id=booking.id
        )
        db.session.add(notification)
        
    elif action == 'cancel':
        now = datetime.now()
        booking_datetime = datetime.combine(booking.booking_date, datetime.strptime(booking.booking_time, '%H:%M').time())
        
        if booking_datetime - now < timedelta(hours=24) and session['user_id'] == booking.student_id:
            flash('Отмена возможна только за 24 часа до начала занятия', 'error')
            return redirect(url_for('dashboard'))
        
        booking.status = 'cancelled'
        flash('Бронирование отменено', 'info')
        
        other_user_id = booking.tutor_id if session['user_id'] == booking.student_id else booking.student_id
        notification = Notification(
            user_id=other_user_id,
            title='Бронирование отменено',
            message=f'Бронирование занятия "{booking.course.title}" на {booking.booking_date} в {booking.booking_time} было отменено',
            type='booking_cancelled',
            related_id=booking.id
        )
        db.session.add(notification)
    
    elif action == 'complete' and session['user_id'] == booking.tutor_id and booking.status == 'confirmed':
        booking.status = 'completed'
        booking.completed_at = datetime.utcnow()
        flash('Занятие завершено. Теперь студент может оставить отзыв.', 'success')
    
    db.session.commit()
    return redirect(url_for('dashboard'))

@app.route('/subscribe/<int:tutor_id>')
def subscribe(tutor_id):
    if 'user_id' not in session or session['role'] != 'student':
        flash('Только студенты могут подписываться на репетиторов', 'error')
        return redirect(url_for('login'))
    
    tutor = User.query.get_or_404(tutor_id)
    if tutor.role != 'tutor':
        abort(404)
    
    subscription = Subscription.query.filter_by(
        subscriber_id=session['user_id'],
        tutor_id=tutor_id
    ).first()
    
    if subscription:
        db.session.delete(subscription)
        flash(f'Вы отписались от репетитора {tutor.username}', 'info')
    else:
        subscription = Subscription(
            subscriber_id=session['user_id'],
            tutor_id=tutor_id
        )
        db.session.add(subscription)
        flash(f'Вы подписались на репетитора {tutor.username}', 'success')
    
    db.session.commit()
    return redirect(url_for('tutor_profile', tutor_id=tutor_id))

@app.route('/favorite/<int:tutor_id>')
def toggle_favorite(tutor_id):
    if 'user_id' not in session or session['role'] != 'student':
        flash('Только студенты могут добавлять репетиторов в избранное', 'error')
        return redirect(url_for('login'))
    
    tutor = User.query.get_or_404(tutor_id)
    if tutor.role != 'tutor':
        abort(404)
    
    favorite = Favorite.query.filter_by(
        student_id=session['user_id'],
        tutor_id=tutor_id
    ).first()
    
    if favorite:
        db.session.delete(favorite)
        flash(f'{tutor.username} удален из избранного', 'info')
    else:
        favorite = Favorite(
            student_id=session['user_id'],
            tutor_id=tutor_id
        )
        db.session.add(favorite)
        flash(f'{tutor.username} добавлен в избранное', 'success')
    
    db.session.commit()
    return redirect(url_for('tutor_profile', tutor_id=tutor_id))

@app.route('/publish_service', methods=['GET', 'POST'])
def publish_service():
    if 'user_id' not in session or session['role'] != 'tutor':
        flash('Только репетиторы могут публиковать услуги', 'error')
        return redirect(url_for('login'))
    
    subjects = Subject.query.all()
    
    if request.method == 'POST':
        title = request.form['title']
        description = request.form['description']
        price = float(request.form['price'])
        duration = int(request.form['duration'])
        subject = request.form['subject']
        level = request.form['level']
        
        course = Course(
            tutor_id=session['user_id'],
            title=title,
            description=description,
            price=price,
            duration=duration,
            subject=subject,
            level=level
        )
        
        db.session.add(course)
        db.session.commit()
        
        flash('Услуга успешно опубликована!', 'success')
        return redirect(url_for('dashboard'))
    
    return render_template('publish_service.html', subjects=subjects)

@app.route('/review/<int:booking_id>', methods=['GET', 'POST'])
def submit_review(booking_id):
    if 'user_id' not in session or session['role'] != 'student':
        flash('Только студенты могут оставлять отзывы', 'error')
        return redirect(url_for('login'))
    
    booking = Booking.query.get_or_404(booking_id)
    
    if booking.student_id != session['user_id'] or booking.status != 'completed':
        abort(403)
    
    existing_review = Review.query.filter_by(booking_id=booking_id).first()
    if existing_review:
        flash('Вы уже оставили отзыв для этого занятия', 'info')
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        rating = int(request.form['rating'])
        comment = request.form['comment']
        
        review = Review(
            student_id=session['user_id'],
            tutor_id=booking.tutor_id,
            booking_id=booking_id,
            rating=rating,
            comment=comment
        )
        
        db.session.add(review)
        booking.status = 'reviewed'
        db.session.commit()
        
        flash('Спасибо за ваш отзыв!', 'success')
        return redirect(url_for('dashboard'))
    
    return render_template('review.html', booking=booking)

@app.route('/chat/<int:recipient_id>')
def chat_room(recipient_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    recipient = User.query.get_or_404(recipient_id)
    current_user = User.query.get(session['user_id'])
    
    bookings = Booking.query.filter(
        ((Booking.student_id == session['user_id']) & (Booking.tutor_id == recipient_id)) |
        ((Booking.student_id == recipient_id) & (Booking.tutor_id == session['user_id']))
    ).order_by(Booking.booking_date.desc()).all()
    
    messages = Message.query.filter(
        ((Message.sender_id == session['user_id']) & (Message.recipient_id == recipient_id)) |
        ((Message.sender_id == recipient_id) & (Message.recipient_id == session['user_id']))
    ).order_by(Message.timestamp.asc()).all()
    
    Message.query.filter_by(
        sender_id=recipient_id,
        recipient_id=session['user_id'],
        is_read=False
    ).update({'is_read': True})
    db.session.commit()
    
    room_id = f"{min(session['user_id'], recipient_id)}_{max(session['user_id'], recipient_id)}"
    
    return render_template('chat.html', 
                         recipient=recipient, 
                         messages=messages, 
                         bookings=bookings,
                         room_id=room_id)

@app.route('/change_role', methods=['POST'])
def change_role():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user = User.query.get(session['user_id'])
    new_role = request.form['new_role']
    
    if new_role not in ['student', 'tutor']:
        flash('Неверная роль', 'error')
        return redirect(url_for('dashboard'))
    
    if user.role == 'tutor' and new_role == 'student':
        Course.query.filter_by(tutor_id=user.id).delete()
        flash('Ваши опубликованные услуги были удалены', 'info')
    
    user.role = new_role
    db.session.commit()
    session['role'] = new_role
    
    flash(f'Ваша роль изменена на: {"Репетитор" if new_role == "tutor" else "Студент"}', 'success')
    return redirect(url_for('dashboard'))

# ===== SOCKET.IO ЧАТ =====

@socketio.on('join')
def on_join(data):
    room = data['room']
    join_room(room)
    emit('status', {'msg': f'{session.get("username", "User")} присоединился к чату'}, room=room)

@socketio.on('leave')
def on_leave(data):
    room = data['room']
    leave_room(room)
    emit('status', {'msg': f'{session.get("username", "User")} покинул чат'}, room=room)

@socketio.on('message')
def handle_message(data):
    room = data['room']
    recipient_id = data['recipient_id']
    content = data['content']
    booking_id = data.get('booking_id')
    
    message = Message(
        sender_id=session['user_id'],
        recipient_id=recipient_id,
        booking_id=booking_id,
        content=content
    )
    db.session.add(message)
    db.session.commit()
    
    emit('message', {
        'sender_id': session['user_id'],
        'sender_name': session['username'],
        'content': content,
        'timestamp': message.timestamp.strftime('%H:%M'),
        'message_id': message.id
    }, room=room)
    
    notification = Notification(
        user_id=recipient_id,
        title='Новое сообщение',
        message=f'{session["username"]}: {content[:50]}...',
        type='new_message',
        related_id=message.id
    )
    db.session.add(notification)
    db.session.commit()

@socketio.on('connect')
def on_connect():
    if 'user_id' not in session:
        return False
    print(f'Client {session["user_id"]} connected')

@socketio.on('disconnect')
def on_disconnect():
    print(f'Client {session.get("user_id", "unknown")} disconnected')


@app.route('/payment/<int:booking_id>', methods=['GET', 'POST'])
def payment(booking_id):
    if 'user_id' not in session or session['role'] != 'student':
        flash('Только студенты могут оплачивать бронирования', 'error')
        return redirect(url_for('login'))
    
    booking = Booking.query.get_or_404(booking_id)
    
    # Проверка: студент может оплатить только своё подтвержденное бронирование
    if booking.student_id != session['user_id'] or booking.status != 'confirmed':
        abort(403)
    
    # Проверка: бронирование уже оплачено
    existing_transaction = Transaction.query.filter_by(booking_id=booking_id, status='completed').first()
    if existing_transaction:
        flash('Это бронирование уже оплачено', 'info')
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        payment_method_id = request.form.get('payment_method_id')
        
        # В демо-режиме: имитация успешной оплаты
        transaction = Transaction(
            booking_id=booking_id,
            student_id=session['user_id'],
            tutor_id=booking.tutor_id,
            amount=booking.course.price,
            payment_method_id=payment_method_id,
            status='completed',
            transaction_id=f"DEMO-{secrets.token_hex(8)}"
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        flash(f'Оплата успешно проведена! Сумма: {booking.course.price} руб.', 'success')
        return redirect(url_for('dashboard'))
    
    # Получаем сохраненные способы оплаты студента
    payment_methods = PaymentMethod.query.filter_by(user_id=session['user_id']).all()
    
    return render_template('payment.html', booking=booking, payment_methods=payment_methods)
if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)