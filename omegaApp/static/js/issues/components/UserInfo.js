import React, { useState, useEffect } from 'react';
import { Card, Avatar, List, Tag, Spin, Alert } from 'antd';
import { UserOutlined, ProjectOutlined, TeamOutlined } from '@ant-design/icons';

const UserInfo = () => {
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchUserInfo();
    }, []);

    const fetchUserInfo = async () => {
        try {
            const response = await fetch('/issues/user/info');
            const data = await response.json();
            
            if (data.success) {
                setUserInfo(data);
                setError(null);
            } else {
                setError(data.error || 'Failed to fetch user info');
            }
        } catch (err) {
            setError('Failed to fetch user information');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Spin size="large" />;
    }

    if (error) {
        return <Alert type="error" message={error} />;
    }

    return (
        <div className="user-info-container">
            <Card title="מידע משתמש" className="user-info-card">
                {userInfo && (
                    <>
                        <div className="user-basic-info">
                            <Avatar size={64} icon={<UserOutlined />} />
                            <div className="user-details">
                                <h3>{userInfo.user.displayName}</h3>
                                <p>{userInfo.user.emailAddress}</p>
                                <Tag color={userInfo.user.active ? 'green' : 'red'}>
                                    {userInfo.user.active ? 'פעיל' : 'לא פעיל'}
                                </Tag>
                            </div>
                        </div>

                        <div className="user-projects">
                            <h4><ProjectOutlined /> פרויקטים</h4>
                            <List
                                size="small"
                                dataSource={userInfo.projects}
                                renderItem={project => (
                                    <List.Item>
                                        <Tag color="blue">{project.key}</Tag>
                                        {project.name}
                                    </List.Item>
                                )}
                            />
                        </div>

                        <div className="user-groups">
                            <h4><TeamOutlined /> קבוצות</h4>
                            <List
                                size="small"
                                dataSource={userInfo.groups}
                                renderItem={group => (
                                    <List.Item>
                                        <Tag color="purple">{group.name}</Tag>
                                    </List.Item>
                                )}
                            />
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
};

export default UserInfo; 